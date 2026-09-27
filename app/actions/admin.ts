"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

import { CONFIG } from "@/lib/config"
import { createAdminSession, clearAdminSession, verifyAdminPassword } from "@/lib/admin-auth"
import { isFail, withAction } from "@/lib/action"
import { clearCurrencySymbol } from "@/lib/products"
import { db } from "@/lib/server/db"
import { requireActionAdmin, actionErrorMessage } from "@/lib/server/action-context"
import { getBulkMailBalance, getBulkMailStock, listBulkMailProducts, listAllBulkMailCatalogProducts, getBulkMailPricePreview, listBulkMailOrders, getBulkMailOrder, cancelBulkMailOrder, exportBulkMailOrder } from "@/lib/server/bulkmail"
import { getUsdToLocalRate } from "@/lib/server/fx"
import { getHotmailBalance as fetchHotmailBalance, getHotmailStock as fetchHotmailStock, listHotmailProducts } from "@/lib/server/hotmail143"
import { fulfill } from "@/lib/server/fulfillment"
import { notify } from "@/lib/server/notifications"
import { isPrismaNotFound } from "@/lib/server/http"

function actionError(e: unknown, fallback: string) {
  return { success: false as const, message: e instanceof Error ? e.message : fallback }
}

function err(status: number, message: string): never {
  const e = new Error(message) as Error & { status?: number }
  e.status = status
  throw e
}

// --- Admin session -----------------------------------------------------------

export async function adminLogin(password: string) {
  const ok = typeof password === "string" && (await verifyAdminPassword(password))
  if (!ok) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    return { success: false, message: "Incorrect password." }
  }
  try {
    await createAdminSession()
  } catch {
    return { success: false, message: "Server is misconfigured (admin secret missing)." }
  }
  return { success: true, message: "Signed in." }
}

export async function adminLogout() {
  await clearAdminSession()
  return { success: true, message: "Signed out." }
}

// --- Overview ----------------------------------------------------------------

export async function getAdminOverview() {
  await requireActionAdmin()
  const since = new Date()
  since.setDate(since.getDate() - 13)
  since.setHours(0, 0, 0, 0)
  const sinceYear = new Date()
  sinceYear.setDate(sinceYear.getDate() - 366)
  sinceYear.setHours(0, 0, 0, 0)

  const [userCount, orderCount, pendingDeposits, walletAgg, windowOrders, siteSettings] =
    await Promise.all([
      db.user.count(),
      db.order.count(),
      db.depositRequest.count({ where: { status: "pending" } }),
      db.wallet.aggregate({ _sum: { balance: true } }),
      db.order.findMany({
        where: { purchasedAt: { gte: sinceYear } },
        select: { purchasedAt: true, price: true, quantity: true, status: true, actualCost: true },
        take: 10000,
        orderBy: { purchasedAt: "desc" },
      }),
      db.siteSetting.findUnique({ where: { id: 1 } }),
    ])
  const siteSettingsRow = siteSettings
  const usdToLocalRate = siteSettingsRow ? Number(siteSettingsRow.usdToLocalRate) || 1 : 1
  const siteCurrency = siteSettingsRow?.currencySymbol ?? "BDT"
  const [hotmailBalanceRes, bulkmailBalanceRes, fxRateRes] = await Promise.all([
    fetchHotmailBalance().then((r) => r.balance).catch(() => null),
    getBulkMailBalance().then((r) => r.balance).catch(() => null),
    getUsdToLocalRate(
      siteSettingsRow?.currencySymbol ?? "BDT",
      siteSettingsRow ? Number(siteSettingsRow.usdToLocalRate) || 1 : 1,
      (siteSettingsRow as { fxLiveEnabled?: boolean } | null)?.fxLiveEnabled ?? true,
    ).catch(() => null),
  ])
  const hotmailBalance: number | null =
    typeof hotmailBalanceRes === "number" && Number.isFinite(hotmailBalanceRes) ? hotmailBalanceRes : null
  const bulkmailBalanceUsd: number | null =
    typeof bulkmailBalanceRes === "number" && Number.isFinite(bulkmailBalanceRes) ? bulkmailBalanceRes : null
  const liveRate = fxRateRes && typeof fxRateRes.rate === "number" && Number.isFinite(fxRateRes.rate) ? fxRateRes.rate : null
  const liveSource = fxRateRes?.source ?? null
  const recentOrders = windowOrders.filter((o) => o.purchasedAt && new Date(o.purchasedAt) >= since)
  let totals: Array<{ sales: number; cost: number }> = [{ sales: 0, cost: 0 }]
  try {
    totals = await db.$queryRaw<Array<{ sales: number; cost: number }>>`
      SELECT
        COALESCE(SUM(price * quantity), 0)::float AS sales,
        COALESCE(SUM(COALESCE(actual_cost, 0)), 0)::float AS cost
      FROM orders WHERE status = 'completed'
    `
  } catch {
    /* fallback below */
  }
  const allOrdersForRevenue = windowOrders as unknown as Array<{
    price: unknown; quantity: number | null; status: string | null; purchasedAt: Date; actualCost: unknown | null
  }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salesFor = (o: any) => Number(o.price) * (o.quantity ?? 1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profitFor = (o: any) => Number(o.price) * (o.quantity ?? 1) - Number(o.actualCost ?? 0)
  const completedForRevenue = allOrdersForRevenue.filter((o) => (o.status ?? "").toString().toLowerCase() === "completed")
  const revenueSource = completedForRevenue.length > 0 ? completedForRevenue : allOrdersForRevenue
  const useDbTotals = completedForRevenue.length > 0 && totals[0]
  const totalCustomerAmount = useDbTotals ? Number(totals[0].sales ?? 0) : revenueSource.reduce((sum, o) => sum + salesFor(o), 0)
  const totalSales = totalCustomerAmount
  const totalHotmailCost = useDbTotals ? Number(totals[0].cost ?? 0) : revenueSource.reduce((sum, o) => sum + Number(o.actualCost ?? 0), 0)
  const presentHotmailBalance: number | null = typeof hotmailBalance === "number" ? hotmailBalance : null
  const previousHotmailBalance: number | null = null
  const presentBulkmailBalanceUsd: number | null = typeof bulkmailBalanceUsd === "number" ? bulkmailBalanceUsd : null
  const presentBulkmailBalance: number | null =
    presentBulkmailBalanceUsd != null ? Number((presentBulkmailBalanceUsd * (liveRate ?? usdToLocalRate)).toFixed(2)) : null
  const bulkmailRate: number | null = liveRate ?? usdToLocalRate
  const bulkmailRateSource = liveSource ?? "manual"
  const bulkmailCurrency = siteCurrency
  const totalRevenue = totalCustomerAmount - totalHotmailCost
  const totalProfit = totalRevenue

  const now = new Date()
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 6); startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); startOfMonth.setHours(0, 0, 0, 0)
  const startOfYear = new Date(now.getFullYear(), 0, 1); startOfYear.setHours(0, 0, 0, 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inSince = (s: Date) => revenueSource.filter((o: any) => o.purchasedAt && new Date(o.purchasedAt) >= s)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salesSumFor = (s: Date) => inSince(s).reduce((sum: number, o: any) => sum + salesFor(o), 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sumFor = (s: Date) => inSince(s).reduce((sum: number, o: any) => sum + profitFor(o), 0)
  const salesToday = salesSumFor(startOfDay)
  const salesWeek = salesSumFor(startOfWeek)
  const salesMonth = salesSumFor(startOfMonth)
  const salesYear = salesSumFor(startOfYear)
  const revenueToday = sumFor(startOfDay)
  const revenueWeek = sumFor(startOfWeek)
  const revenueMonth = sumFor(startOfMonth)
  const revenueYear = sumFor(startOfYear)

  const revenueByDay: { date: string; revenue: number; sales: number; profit: number; orders: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const day = new Date()
    day.setDate(day.getDate() - i)
    revenueByDay.push({ date: day.toISOString().slice(0, 10), revenue: 0, sales: 0, profit: 0, orders: 0 })
  }
  const dayIndex = new Map(revenueByDay.map((d) => [d.date, d]))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentSource = recentOrders.filter((o: any) => {
    const s = (o.status ?? "").toString().toLowerCase()
    if (completedForRevenue.length > 0) return s === "completed"
    return true
  })
  for (const order of recentSource) {
    const bucket = dayIndex.get(order.purchasedAt.toISOString().slice(0, 10))
    if (bucket) {
      const sale = Number(order.price) * (order.quantity ?? 1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profit = sale - Number((order as any).actualCost ?? 0)
      bucket.sales = Number((bucket.sales + sale).toFixed(2))
      bucket.profit = Number((bucket.profit + profit).toFixed(2))
      bucket.revenue = bucket.sales
      bucket.orders += 1
    }
  }

  return {
    userCount, orderCount,
    totalCustomerAmount: Number(totalCustomerAmount.toFixed(2)),
    totalSales: Number(totalSales.toFixed(2)),
    totalHotmailCost: Number(totalHotmailCost.toFixed(2)),
    presentHotmailBalance, previousHotmailBalance,
    presentBulkmailBalance, presentBulkmailBalanceUsd,
    bulkmailRate, bulkmailRateSource, bulkmailCurrency,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    salesToday: Number(salesToday.toFixed(2)),
    salesWeek: Number(salesWeek.toFixed(2)),
    salesMonth: Number(salesMonth.toFixed(2)),
    salesYear: Number(salesYear.toFixed(2)),
    profitToday: Number(revenueToday.toFixed(2)),
    profitWeek: Number(revenueWeek.toFixed(2)),
    profitMonth: Number(revenueMonth.toFixed(2)),
    profitYear: Number(revenueYear.toFixed(2)),
    revenueToday: Number(revenueToday.toFixed(2)),
    revenueWeek: Number(revenueWeek.toFixed(2)),
    revenueMonth: Number(revenueMonth.toFixed(2)),
    revenueYear: Number(revenueYear.toFixed(2)),
    pendingDeposits,
    totalWalletLiability: Number(walletAgg._sum.balance ?? 0),
    revenueByDay,
  }
}

// --- Products ------------------------------------------------------------------

export async function listProducts(section?: string) {
  await requireActionAdmin()
  const rows = await db.product.findMany({
    where: section ? { section } : undefined,
    orderBy: section ? [{ sortOrder: "asc" }] : [{ section: "asc" }, { sortOrder: "asc" }],
  })
  return rows.map((p) => ({
    id: p.id, slug: p.slug, name: p.name, category: p.category, section: p.section,
    price: Number(p.price), originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
    stock: p.stock, tag: p.tag ?? "", badge: p.badge ?? "",
    active: p.active, featured: p.featured,
    externalProductType: p.externalProductType ?? "",
    externalAccountType: p.externalAccountType ?? "",
    supplier: p.supplier ?? "hotmail143",
    bulkmailProductId: p.bulkmailProductId ?? null,
  }))
}

function reqStr(v: unknown, field: string, min: number, max: number, required: boolean): string | undefined {
  if (v === undefined || v === null) {
    if (required) err(400, `${field} is required.`)
    return undefined
  }
  if (typeof v !== "string" || v.length < min || v.length > max) {
    err(400, `${field} must be a string of length ${min}-${max}.`)
  }
  if (required && (v as string).length < 1) err(400, `${field} is required.`)
  return v as string
}

function reqNum(v: unknown, field: string, min: number, max: number, required: boolean): number | undefined {
  if (v === undefined || v === null) {
    if (required) err(400, `${field} is required.`)
    return undefined
  }
  const n = Number(v)
  if (!Number.isFinite(n) || n < min || n > max) {
    err(400, `${field} must be a number between ${min} and ${max}.`)
  }
  return n
}

export async function upsertProduct(input: {
  id?: number
  slug: string
  name: string
  category: string
  section: string
  price: number
  originalPrice?: number | null
  stock: number
  tag?: string
  badge?: string
  active: boolean
  featured: boolean
  externalProductType?: string
  externalAccountType?: string
  supplier?: string
  bulkmailProductId?: number | null
}) {
  try {
    await requireActionAdmin()
    const body = input as Record<string, unknown>
    let id: number | undefined
    if (body.id !== undefined && body.id !== null) {
      const n = Number(body.id)
      if (!Number.isInteger(n)) err(400, "id must be an integer.")
      id = n
    }
    const slug = reqStr(body.slug, "slug", 1, 160, true)!
    const name = reqStr(body.name, "name", 1, 200, true)!
    const category = reqStr(body.category, "category", 1, 80, true)!
    const section = reqStr(body.section, "section", 1, 40, true)!
    const price = reqNum(body.price, "price", 0, 1_000_000, true)!
    let originalPrice: number | null | undefined
    if (body.originalPrice !== undefined && body.originalPrice !== null) {
      originalPrice = reqNum(body.originalPrice, "originalPrice", 0, 1_000_000, false)
    } else {
      originalPrice = body.originalPrice === null ? null : undefined
    }
    let stock: number
    {
      const n = Number(body.stock)
      if (!Number.isInteger(n) || n < 0 || n > 1_000_000) err(400, "stock must be an integer between 0 and 1000000.")
      stock = n
    }
    const tag = body.tag === undefined || body.tag === null ? undefined : reqStr(body.tag, "tag", 0, 100000, false)
    const badge = body.badge === undefined || body.badge === null ? undefined : reqStr(body.badge, "badge", 0, 100000, false)
    if (typeof body.active !== "boolean") err(400, "active must be a boolean.")
    if (typeof body.featured !== "boolean") err(400, "featured must be a boolean.")
    const externalProductType = body.externalProductType === undefined || body.externalProductType === null ? undefined : reqStr(body.externalProductType, "externalProductType", 0, 60, false)
    const externalAccountType = body.externalAccountType === undefined || body.externalAccountType === null ? undefined : reqStr(body.externalAccountType, "externalAccountType", 0, 60, false)
    const supplierRaw = body.supplier === undefined || body.supplier === null ? undefined : reqStr(body.supplier, "supplier", 0, 20, false)
    let bulkmailProductId: number | null | undefined
    if (body.bulkmailProductId !== undefined && body.bulkmailProductId !== null) {
      const n = Number(body.bulkmailProductId)
      if (!Number.isInteger(n) || n < 1) err(400, "bulkmailProductId must be an integer >= 1.")
      bulkmailProductId = n
    } else {
      bulkmailProductId = body.bulkmailProductId === null ? null : undefined
    }

    const externalProductTypeNorm = externalProductType?.trim() || null
    const externalAccountTypeNorm = externalAccountType?.trim() || null
    const allowedSuppliers = ["hotmail143", "bulkmail", "custom"]
    const supplier = (supplierRaw ?? "hotmail143").toLowerCase()
    if (!allowedSuppliers.includes(supplier)) err(400, "Invalid supplier. Use hotmail143, bulkmail, or custom.")
    const bulkmailId = bulkmailProductId != null && Number.isInteger(Number(bulkmailProductId)) ? Number(bulkmailProductId) : null
    if (supplier === "bulkmail" && bulkmailId == null) err(400, "BulkMail products require a BulkMail product id.")
    let effectiveSupplier = supplier
    if (supplier === "hotmail143" && (!externalProductTypeNorm || !externalAccountTypeNorm)) {
      effectiveSupplier = "custom"
    }

    try {
      if (id) {
        await db.product.update({
          where: { id },
          data: {
            name, category, section,
            price: price.toFixed(2),
            originalPrice: originalPrice ? originalPrice.toFixed(2) : null,
            stock, tag: tag || null, badge: badge || null,
            active: body.active as boolean, featured: body.featured as boolean,
            externalProductType: externalProductTypeNorm,
            externalAccountType: externalAccountTypeNorm,
            supplier: effectiveSupplier, bulkmailProductId: bulkmailId,
            updatedAt: new Date(),
          },
        })
      } else {
        await db.product.create({
          data: {
            slug, name, category, section,
            price: price.toFixed(2),
            originalPrice: originalPrice ? originalPrice.toFixed(2) : null,
            stock, tag: tag || null, badge: badge || null,
            active: body.active as boolean, featured: body.featured as boolean,
            externalProductType: externalProductTypeNorm,
            externalAccountType: externalAccountTypeNorm,
            supplier: effectiveSupplier, bulkmailProductId: bulkmailId,
          },
        })
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") err(400, "A product with this slug already exists.")
        if (error.code === "P2025") err(404, "Product not found.")
      }
      throw error
    }
    revalidatePath("/admin/products")
    revalidatePath("/")
    revalidatePath("/dashboard")
    return { success: true as const }
  } catch (e) {
    return actionError(e, "Could not save product.")
  }
}

export async function deleteProduct(id: number) {
  try {
    await requireActionAdmin()
    if (!Number.isInteger(id)) err(400, "Invalid product id.")
    await db.product.delete({ where: { id } })
    revalidatePath("/admin/products")
    return { success: true as const }
  } catch (e) {
    return actionError(e, "Could not delete product.")
  }
}

// --- Categories ---------------------------------------------------------------

function slugifyCategory(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60)
}

async function uniqueCategorySlug(name: string, excludeId?: number): Promise<string> {
  const base = slugifyCategory(name) || "cat"
  let candidate = base
  let n = 1
  for (;;) {
    const found = await db.category.findFirst({
      where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    })
    if (!found) return candidate
    candidate = `${base}-${n++}`
  }
}

export async function listCategories() {
  await requireActionAdmin()
  const rows = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] })
  return rows.map((c) => ({ id: c.id, name: c.name, active: c.active, isCustom: c.isCustom }))
}

export async function createCategory(name: string) {
  try {
    await requireActionAdmin()
    if (typeof name !== "string" || name.trim().length < 1 || name.length > 60) {
      err(400, "name must be a string of length 1-60.")
    }
    const trimmed = name.trim()
    if (!trimmed) err(400, "Category name is required.")
    const clash = await db.category.findFirst({ where: { name: { equals: trimmed, mode: "insensitive" } } })
    if (clash) err(400, "A category with this name already exists.")
    const max = await db.category.aggregate({ _max: { sortOrder: true } })
    const nextOrder = (max._max.sortOrder ?? 0) + 1
    try {
      const slug = await uniqueCategorySlug(trimmed)
      const created = await db.category.create({
        data: { name: trimmed, slug, isCustom: true, active: true, sortOrder: nextOrder },
      })
      revalidatePath("/admin/categories"); revalidatePath("/dashboard")
      return { success: true as const, category: { id: created.id, name: created.name, active: created.active, isCustom: created.isCustom } }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const slug = await uniqueCategorySlug(`${trimmed}-${Date.now() % 10000}`)
        const created = await db.category.create({
          data: { name: trimmed, slug, isCustom: true, active: true, sortOrder: nextOrder },
        })
        revalidatePath("/admin/categories"); revalidatePath("/dashboard")
        return { success: true as const, category: { id: created.id, name: created.name, active: created.active, isCustom: created.isCustom } }
      }
      throw error
    }
  } catch (e) {
    return actionError(e, "Could not create category.")
  }
}

export async function updateCategory(id: number, input: { name?: string; active?: boolean }) {
  try {
    await requireActionAdmin()
    if (!Number.isInteger(id)) err(400, "Invalid category id.")
    let name: string | undefined
    if (input.name !== undefined) {
      if (typeof input.name !== "string" || input.name.trim().length < 1 || input.name.length > 60) {
        err(400, "name must be a string of length 1-60.")
      }
      name = input.name
    }
    let active: boolean | undefined
    if (input.active !== undefined) {
      if (typeof input.active !== "boolean") err(400, "active must be a boolean.")
      active = input.active
    }
    const cat = await db.category.findUnique({ where: { id } })
    if (!cat) err(400, "Category not found.")
    const result = await db.$transaction(async (tx) => {
      const data: { name?: string; slug?: string; active?: boolean } = {}
      if (name !== undefined) {
        const trimmed = name.trim()
        if (!trimmed) err(400, "Category name is required.")
        if (trimmed.toLowerCase() !== cat!.name.toLowerCase()) {
          const clash = await tx.category.findFirst({
            where: { name: { equals: trimmed, mode: "insensitive" }, NOT: { id } },
          })
          if (clash) err(400, "A category with this name already exists.")
          await tx.product.updateMany({ where: { category: cat!.name }, data: { category: trimmed } })
          data.name = trimmed
          data.slug = await uniqueCategorySlug(trimmed, id)
        }
      }
      if (active !== undefined) data.active = active
      if (Object.keys(data).length === 0) return { success: true as const }
      const updated = await tx.category.update({ where: { id }, data })
      return { success: true as const, category: { id: updated.id, name: updated.name, active: updated.active, isCustom: updated.isCustom } }
    })
    revalidatePath("/admin/categories"); revalidatePath("/dashboard")
    return result
  } catch (e) {
    return actionError(e, "Could not update category.")
  }
}

export async function deleteCategory(id: number) {
  try {
    await requireActionAdmin()
    if (!Number.isInteger(id)) err(400, "Invalid category id.")
    const cat = await db.category.findUnique({ where: { id } })
    if (!cat) err(400, "Category not found.")
    const used = await db.product.count({ where: { category: cat.name } })
    if (used > 0) {
      err(400, `Cannot delete "${cat.name}" because ${used} product(s) still use it. Reassign or remove those products first.`)
    }
    await db.category.delete({ where: { id } })
    revalidatePath("/admin/categories"); revalidatePath("/dashboard")
    return { success: true as const }
  } catch (e) {
    return actionError(e, "Could not delete category.")
  }
}

export async function listPublicCategories() {
  const rows = await db.category.findMany({
    where: { active: true },
    select: { name: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  })
  return rows.map((r) => r.name)
}

// --- Payment methods -----------------------------------------------------------

export async function listPaymentMethods() {
  await requireActionAdmin()
  const rows = await db.paymentMethod.findMany({ orderBy: { sortOrder: "asc" } })
  return rows.map((m) => ({
    id: m.id, name: m.name, type: m.type,
    accountNumber: m.accountNumber ?? "", accountName: m.accountName ?? "",
    instructions: m.instructions ?? "", icon: m.icon ?? "",
    enabled: m.enabled, sortOrder: m.sortOrder,
  }))
}

export async function listEnabledPaymentMethods() {
  const rows = await db.paymentMethod.findMany({ where: { enabled: true }, orderBy: { sortOrder: "asc" } })
  return rows.map((m) => ({
    id: m.id, name: m.name, type: m.type,
    accountNumber: m.accountNumber ?? "", accountName: m.accountName ?? "",
    instructions: m.instructions ?? "", icon: m.icon ?? "",
  }))
}

function optStrMax(v: unknown, max: number, field: string): string | undefined {
  if (v === undefined || v === null) return undefined
  if (typeof v !== "string" || v.length > max) err(400, `${field} must be a string of max ${max} characters.`)
  return v as string
}

export async function upsertPaymentMethod(input: {
  id?: number
  name: string
  type: string
  accountNumber?: string
  accountName?: string
  instructions?: string
  icon?: string
  enabled: boolean
  sortOrder: number
}) {
  try {
    await requireActionAdmin()
    const body = input as Record<string, unknown>
    let id: number | undefined
    if (body.id !== undefined && body.id !== null) {
      const n = typeof body.id === "number" ? body.id : Number(body.id)
      if (!Number.isInteger(n)) err(400, "id must be an integer.")
      id = n
    }
    if (typeof body.name !== "string" || body.name.length < 1 || body.name.length > 80) err(400, "name must be a string of 1-80 characters.")
    if (typeof body.type !== "string" || body.type.length < 1 || body.type.length > 40) err(400, "type must be a string of 1-40 characters.")
    const accountNumber = optStrMax(body.accountNumber, 120, "accountNumber")
    const accountName = optStrMax(body.accountName, 120, "accountName")
    const instructions = optStrMax(body.instructions, 2000, "instructions")
    const icon = optStrMax(body.icon, 500, "icon")
    if (typeof body.enabled !== "boolean") err(400, "enabled must be a boolean.")
    const sortOrderRaw = typeof body.sortOrder === "number" ? body.sortOrder : Number(body.sortOrder)
    if (!Number.isInteger(sortOrderRaw)) err(400, "sortOrder must be an integer.")
    const data = {
      name: body.name as string, type: body.type as string,
      accountNumber: accountNumber || null, accountName: accountName || null,
      instructions: instructions || null, icon: icon || null,
      enabled: body.enabled as boolean, sortOrder: sortOrderRaw,
    }
    try {
      if (id) {
        await db.paymentMethod.update({ where: { id }, data: { ...data, updatedAt: new Date() } })
      } else {
        await db.paymentMethod.create({ data })
      }
    } catch (error) {
      if (isPrismaNotFound(error)) err(404, "Payment method not found.")
      throw error
    }
    revalidatePath("/admin/payment-methods"); revalidatePath("/dashboard/pay")
    return { success: true as const }
  } catch (e) {
    return actionError(e, "Could not save payment method.")
  }
}

export async function deletePaymentMethod(id: number) {
  try {
    await requireActionAdmin()
    if (!Number.isInteger(id)) err(400, "Validation failed (numeric string is expected).")
    const used = await db.depositRequest.count({ where: { paymentMethodId: id } })
    if (used > 0) {
      err(400, "Cannot delete this payment method because deposit requests reference it. Disable it instead.")
    }
    try {
      await db.paymentMethod.delete({ where: { id } })
    } catch (error) {
      if (isPrismaNotFound(error)) err(404, "Payment method not found.")
      throw error
    }
    revalidatePath("/admin/payment-methods")
    return { success: true as const }
  } catch (e) {
    return actionError(e, "Could not delete payment method.")
  }
}

// --- Site settings -----------------------------------------------------------

export async function getAdminSettings() {
  await requireActionAdmin()
  const row = await db.siteSetting.findUnique({ where: { id: 1 } })
  return row
    ? {
        currencySymbol: row.currencySymbol,
        usdToLocalRate: Number(row.usdToLocalRate),
        minDepositUsd: Number(row.minDepositUsd),
        minTransferAmount: Number(row.minTransferAmount),
        initialBalance: Number(row.initialBalance),
        siteName: row.siteName,
        supportUrl: row.supportUrl ?? "",
        heroTitle: row.heroTitle ?? "",
        heroSubtitle: row.heroSubtitle ?? "",
        footerText: row.footerText ?? "",
        hotmailApiKey: (row as { hotmailApiKey?: string | null }).hotmailApiKey ?? "",
        hotmailApiBaseUrl: (row as { hotmailApiBaseUrl?: string | null }).hotmailApiBaseUrl ?? "",
        bulkmailApiKey: (row as { bulkmailApiKey?: string | null }).bulkmailApiKey ?? "",
        bulkmailApiBaseUrl: (row as { bulkmailApiBaseUrl?: string | null }).bulkmailApiBaseUrl ?? "",
        fxLiveEnabled: (row as { fxLiveEnabled?: boolean }).fxLiveEnabled ?? true,
        heroBadge: row.heroBadge ?? "",
        aboutTitle: row.aboutTitle ?? "",
        aboutSubtitle: row.aboutSubtitle ?? "",
        aboutHeading: row.aboutHeading ?? "",
        aboutPara1: row.aboutPara1 ?? "",
        aboutPara2: row.aboutPara2 ?? "",
        stat1Value: row.stat1Value ?? "",
        stat1Label: row.stat1Label ?? "",
        stat2Value: row.stat2Value ?? "",
        stat2Label: row.stat2Label ?? "",
        stat3Value: row.stat3Value ?? "",
        stat3Label: row.stat3Label ?? "",
        stat4Value: row.stat4Value ?? "",
        stat4Label: row.stat4Label ?? "",
        trustTitle: row.trustTitle ?? "",
        trustDesc: row.trustDesc ?? "",
        trustBullets: row.trustBullets ?? "",
        valuesTitle: row.valuesTitle ?? "",
        valuesSubtitle: row.valuesSubtitle ?? "",
        featuresTitle: row.featuresTitle ?? "",
        featuresSubtitle: row.featuresSubtitle ?? "",
        teamTitle: row.teamTitle ?? "",
        teamDescription: row.teamDescription ?? "",
        teamStat1Value: row.teamStat1Value ?? "",
        teamStat1Label: row.teamStat1Label ?? "",
        teamStat2Value: row.teamStat2Value ?? "",
        teamStat2Label: row.teamStat2Label ?? "",
        teamImageUrl: row.teamImageUrl ?? "",
        testimonialsTitle: row.testimonialsTitle ?? "",
        testimonialsSubtitle: row.testimonialsSubtitle ?? "",
        faqTitle: row.faqTitle ?? "",
        ctaBadge: row.ctaBadge ?? "",
        ctaTitle: row.ctaTitle ?? "",
        ctaSubtitle: row.ctaSubtitle ?? "",
        contactPhone: row.contactPhone ?? "",
        contactSupportEmail: row.contactSupportEmail ?? "",
        contactSalesEmail: row.contactSalesEmail ?? "",
      }
    : null
}

const OPTIONAL_LIMITS: Record<string, number> = {
  heroTitle: 2000, heroSubtitle: 2000, footerText: 2000, heroBadge: 120,
  aboutTitle: 200, aboutSubtitle: 500, aboutHeading: 200, aboutPara1: 2000, aboutPara2: 2000,
  stat1Value: 40, stat1Label: 80, stat2Value: 40, stat2Label: 80,
  stat3Value: 40, stat3Label: 80, stat4Value: 40, stat4Label: 80,
  trustTitle: 200, trustDesc: 500, trustBullets: 2000,
  valuesTitle: 200, valuesSubtitle: 500, featuresTitle: 200, featuresSubtitle: 500,
  teamTitle: 200, teamDescription: 1000, teamStat1Value: 80, teamStat1Label: 120,
  teamStat2Value: 80, teamStat2Label: 120, teamImageUrl: 500,
  testimonialsTitle: 200, testimonialsSubtitle: 500, faqTitle: 120,
  ctaBadge: 200, ctaTitle: 200, ctaSubtitle: 500,
  contactPhone: 80, contactSupportEmail: 120, contactSalesEmail: 120,
}

function isValidUrl(v: string): boolean {
  try {
    new URL(v)
    return true
  } catch {
    try {
      const u = new URL(`http://${v}`)
      return u.hostname.includes(".") || u.hostname === "localhost"
    } catch {
      return false
    }
  }
}

export async function updateAdminSettings(input: Record<string, unknown>) {
  try {
    await requireActionAdmin()
    const body = input as Record<string, unknown>
    if (typeof body !== "object" || body === null) err(400, "Invalid request body.")
    const currencySymbol = body.currencySymbol
    if (typeof currencySymbol !== "string" || currencySymbol.length < 1 || currencySymbol.length > 8) {
      err(400, "currencySymbol must be a string of 1-8 characters.")
    }
    const siteName = body.siteName
    if (typeof siteName !== "string" || siteName.length < 1 || siteName.length > 80) {
      err(400, "siteName must be a string of 1-80 characters.")
    }
    const coerceNumber = (v: unknown): number | null => {
      if (typeof v === "number" && Number.isFinite(v)) return v
      if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v)
      return null
    }
    const numbers: Record<string, number> = {}
    for (const key of ["usdToLocalRate", "minDepositUsd", "minTransferAmount", "initialBalance"]) {
      const n = coerceNumber(body[key])
      if (n === null || n < 0 || n > 1_000_000) err(400, `${key} must be a number between 0 and 1000000.`)
      numbers[key] = n
    }
    let supportUrl: string | undefined
    if (typeof body.supportUrl === "string" && body.supportUrl.trim() === "") {
      supportUrl = ""
    } else if (body.supportUrl !== undefined && body.supportUrl !== null) {
      if (typeof body.supportUrl !== "string" || body.supportUrl.length > 500 || !isValidUrl(body.supportUrl)) {
        err(400, "supportUrl must be a valid URL of max 500 characters.")
      }
      supportUrl = body.supportUrl
    }
    const optionals: Record<string, string | undefined> = {}
    for (const [key, max] of Object.entries(OPTIONAL_LIMITS)) {
      const v = body[key]
      if (v === undefined || v === null) continue
      if (typeof v !== "string" || v.length > max) err(400, `${key} must be a string of max ${max} characters.`)
      optionals[key] = v
    }
    const orNull = (v?: string) => v?.trim() || null
    const settingsData = {
      currencySymbol: currencySymbol as string,
      usdToLocalRate: numbers.usdToLocalRate.toFixed(12),
      minDepositUsd: numbers.minDepositUsd.toFixed(2),
      minTransferAmount: numbers.minTransferAmount.toFixed(2),
      initialBalance: numbers.initialBalance.toFixed(2),
      siteName: siteName as string,
      supportUrl: supportUrl || null,
      heroTitle: optionals.heroTitle || null,
      heroSubtitle: optionals.heroSubtitle || null,
      footerText: optionals.footerText || null,
      heroBadge: orNull(optionals.heroBadge),
      aboutTitle: orNull(optionals.aboutTitle),
      aboutSubtitle: orNull(optionals.aboutSubtitle),
      aboutHeading: orNull(optionals.aboutHeading),
      aboutPara1: orNull(optionals.aboutPara1),
      aboutPara2: orNull(optionals.aboutPara2),
      stat1Value: orNull(optionals.stat1Value),
      stat1Label: orNull(optionals.stat1Label),
      stat2Value: orNull(optionals.stat2Value),
      stat2Label: orNull(optionals.stat2Label),
      stat3Value: orNull(optionals.stat3Value),
      stat3Label: orNull(optionals.stat3Label),
      stat4Value: orNull(optionals.stat4Value),
      stat4Label: orNull(optionals.stat4Label),
      trustTitle: orNull(optionals.trustTitle),
      trustDesc: orNull(optionals.trustDesc),
      trustBullets: orNull(optionals.trustBullets),
      valuesTitle: orNull(optionals.valuesTitle),
      valuesSubtitle: orNull(optionals.valuesSubtitle),
      featuresTitle: orNull(optionals.featuresTitle),
      featuresSubtitle: orNull(optionals.featuresSubtitle),
      teamTitle: orNull(optionals.teamTitle),
      teamDescription: orNull(optionals.teamDescription),
      teamStat1Value: orNull(optionals.teamStat1Value),
      teamStat1Label: orNull(optionals.teamStat1Label),
      teamStat2Value: orNull(optionals.teamStat2Value),
      teamStat2Label: orNull(optionals.teamStat2Label),
      teamImageUrl: orNull(optionals.teamImageUrl),
      testimonialsTitle: orNull(optionals.testimonialsTitle),
      testimonialsSubtitle: orNull(optionals.testimonialsSubtitle),
      faqTitle: orNull(optionals.faqTitle),
      ctaBadge: orNull(optionals.ctaBadge),
      ctaTitle: orNull(optionals.ctaTitle),
      ctaSubtitle: orNull(optionals.ctaSubtitle),
      contactPhone: orNull(optionals.contactPhone),
      contactSupportEmail: orNull(optionals.contactSupportEmail),
      contactSalesEmail: orNull(optionals.contactSalesEmail),
      updatedAt: new Date(),
    }
    await db.siteSetting.upsert({ where: { id: 1 }, create: { id: 1, ...settingsData }, update: settingsData })
    clearCurrencySymbol()
    revalidatePath("/admin/settings"); revalidatePath("/dashboard/pay"); revalidatePath("/dashboard/deposit"); revalidatePath("/")
    return { success: true as const }
  } catch (e) {
    return { success: false as const, message: e instanceof Error ? e.message : "Could not save settings." }
  }
}

// --- Users / orders ------------------------------------------------------------

export async function listUsers() {
  await requireActionAdmin()
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" } })
  const walletRows = await db.wallet.findMany()
  const balanceByUserId = new Map(walletRows.map((w) => [w.userId, Number(w.balance)]))
  return users.map((u) => ({
    id: u.id, name: u.name, email: u.email,
    balance: balanceByUserId.get(u.id) ?? 0,
    createdAt: u.createdAt.toISOString(),
  }))
}

export async function getUserDetails(userId: string) {
  await requireActionAdmin()
  const trimmed = userId?.trim()
  if (!trimmed) err(400, "User id is required.")
  const user = await db.user.findUnique({ where: { id: trimmed } })
  if (!user) err(404, "User not found.")
  const [wallet, orders, transactions, deposits, supportRows, sessions, unreadNotifications, totpCount] =
    await Promise.all([
      db.wallet.findUnique({ where: { userId: trimmed } }),
      db.order.findMany({ where: { userId: trimmed }, orderBy: { purchasedAt: "desc" }, take: 200 }),
      db.transaction.findMany({ where: { userId: trimmed }, orderBy: { createdAt: "desc" }, take: 200 }),
      db.depositRequest.findMany({ where: { userId: trimmed }, orderBy: { createdAt: "desc" }, take: 200 }),
      db.supportMessage.findMany({ where: { userId: trimmed }, orderBy: { id: "desc" }, take: 20 }),
      db.session.findMany({ where: { userId: trimmed }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true } }),
      db.notification.count({ where: { userId: trimmed, read: false } }),
      db.totpKey.count({ where: { userId: trimmed } }),
    ])
  const completedOrders = orders.filter((o) => (o.status ?? "").toString().toLowerCase() === "completed")
  const totalSpent = completedOrders.reduce((sum, o) => sum + Number(o.price) * (o.quantity ?? 1), 0)
  const totalDeposited = transactions.filter((t) => t.type === "deposit" && t.status === "completed").reduce((sum, t) => sum + Number(t.amount), 0)
  const pendingDeposits = deposits.filter((d) => d.status === "pending").length
  const unreadSupport = await db.supportMessage.count({ where: { userId: trimmed, sender: "customer", read: false } })
  const lastSupport = supportRows[0] ?? null
  return {
    user: {
      id: user!.id, name: user!.name, email: user!.email, emailVerified: user!.emailVerified,
      image: user!.image ?? null, createdAt: user!.createdAt.toISOString(), updatedAt: user!.updatedAt.toISOString(),
    },
    wallet: {
      balance: Number(wallet?.balance ?? 0),
      referralCode: wallet?.referralCode ?? null, referredBy: wallet?.referredBy ?? null,
      updatedAt: wallet?.updatedAt?.toISOString() ?? null,
    },
    stats: {
      totalOrders: orders.length, completedOrders: completedOrders.length,
      totalSpent: Number(totalSpent.toFixed(2)), totalDeposited: Number(totalDeposited.toFixed(2)),
      totalTransactions: transactions.length, pendingDeposits, unreadSupport, unreadNotifications,
      activeSessions: sessions.filter((s) => new Date(s.expiresAt) > new Date()).length,
      totpKeys: totpCount,
    },
    orders: orders.map((o) => ({
      id: o.id, productName: o.productName, price: Number(o.price), quantity: o.quantity,
      total: Number((Number(o.price) * (o.quantity ?? 1)).toFixed(2)),
      status: o.status, supplier: o.supplier ?? "hotmail143",
      externalOrderId: o.externalOrderId ?? "", purchasedAt: o.purchasedAt.toISOString(),
    })),
    transactions: transactions.map((t) => ({
      id: t.id, type: t.type, description: t.description ?? "", amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter), status: t.status, createdAt: t.createdAt.toISOString(),
    })),
    deposits: deposits.map((d) => ({
      id: d.id, amount: Number(d.amount), currency: d.currency,
      paymentMethodId: d.paymentMethodId ?? null, senderAccountNumber: d.senderAccountNumber ?? "",
      transactionReference: d.transactionReference, status: d.status, adminNote: d.adminNote ?? "",
      createdAt: d.createdAt.toISOString(), reviewedAt: d.reviewedAt?.toISOString() ?? null,
    })),
    support: {
      total: await db.supportMessage.count({ where: { userId: trimmed } }),
      unread: unreadSupport,
      lastText: lastSupport?.text ?? "", lastSender: lastSupport?.sender ?? "",
      lastAt: lastSupport?.createdAt.toISOString() ?? null,
      recent: [...supportRows].reverse().map((m) => ({
        id: m.id, sender: m.sender, text: m.text, read: m.read, createdAt: m.createdAt.toISOString(),
      })),
    },
    sessions: sessions.map((s) => ({
      id: s.id, ipAddress: s.ipAddress ?? "", userAgent: s.userAgent ?? "",
      createdAt: s.createdAt.toISOString(), expiresAt: s.expiresAt.toISOString(),
      active: new Date(s.expiresAt) > new Date(),
    })),
  }
}

export async function adjustUserBalance(userId: string, amount: number, note?: string) {
  await requireActionAdmin()
  const trimmed = userId?.trim() ?? ""
  const amt = Number(amount)
  if (note !== undefined && note !== null) {
    if (typeof note !== "string" || note.length > 300) err(400, "note must be a string of at most 300 characters.")
  }
  if (!Number.isFinite(amt) || amt === 0) err(400, "Enter a non-zero adjustment amount.")
  const user = await db.user.findUnique({ where: { id: trimmed } })
  if (!user) err(400, "User not found.")
  const result = await db.$transaction(async (tx) => {
    await tx.wallet.upsert({ where: { userId: trimmed }, create: { userId: trimmed, balance: "0.00" }, update: {} })
    const current = await tx.wallet.findUniqueOrThrow({ where: { userId: trimmed } })
    const nextBalance = Number((Number(current.balance) + amt).toFixed(2))
    if (nextBalance < 0) err(400, "Adjustment would make the balance negative.")
    const updated = await tx.wallet.update({ where: { userId: trimmed }, data: { balance: { increment: amt }, updatedAt: new Date() } })
    await tx.transaction.create({
      data: {
        userId: trimmed, type: "adjustment",
        description: note?.trim() || "Manual balance adjustment by admin",
        amount: amt.toFixed(2), balanceAfter: Number(updated.balance).toFixed(2), status: "completed",
      },
    })
    return Number(updated.balance)
  })
  revalidatePath("/admin/users"); revalidatePath(`/admin/users/${trimmed}`); revalidatePath("/dashboard")
  return { success: true as const, message: `Balance updated to $${result.toFixed(2)}.` }
}

export async function deleteUser(userId: string) {
  await requireActionAdmin()
  const trimmed = userId?.trim() ?? ""
  const user = await db.user.findUnique({ where: { id: trimmed } })
  if (!user) err(400, "User not found.")
  await db.$transaction(async (tx) => {
    await tx.wallet.deleteMany({ where: { userId: trimmed } })
    await tx.transaction.deleteMany({ where: { userId: trimmed } })
    await tx.order.deleteMany({ where: { userId: trimmed } })
    await tx.depositRequest.deleteMany({ where: { userId: trimmed } })
    await tx.supportMessage.deleteMany({ where: { userId: trimmed } })
    await tx.notification.deleteMany({ where: { userId: trimmed } })
    await tx.session.deleteMany({ where: { userId: trimmed } })
    await tx.account.deleteMany({ where: { userId: trimmed } })
    await tx.user.delete({ where: { id: trimmed } })
  })
  revalidatePath("/admin/users")
  return { success: true as const, message: "User deleted." }
}

export async function listAllOrders(limit = 200, offset = 0) {
  await requireActionAdmin()
  const take = Math.min(500, Math.max(1, Number.isFinite(limit) ? limit : 200))
  const skip = Math.max(0, Number.isFinite(offset) ? offset : 0)
  const rows = await db.order.findMany({ orderBy: { purchasedAt: "desc" }, take, skip })
  const userIds = [...new Set(rows.map((r) => r.userId))]
  const users = userIds.length > 0 ? await db.user.findMany({ where: { id: { in: userIds } } }) : []
  const emailByUserId = new Map(users.map((u) => [u.id, u.email]))
  return rows.map((o) => ({
    id: o.id, userEmail: emailByUserId.get(o.userId) ?? o.userId,
    productName: o.productName, price: Number(o.price), quantity: o.quantity,
    status: o.status, supplier: o.supplier ?? "hotmail143",
    externalOrderId: o.externalOrderId ?? "", purchasedAt: o.purchasedAt.toISOString(),
    deliveredEmail: o.deliveredEmail ?? "", deliveredPassword: o.deliveredPassword ?? "",
    deliveredRefreshToken: o.deliveredRefreshToken ?? "", deliveredClientId: o.deliveredClientId ?? "",
    deliveredCredentials: o.deliveredCredentials ?? "",
  }))
}

export async function getAdminOrder(id: number) {
  await requireActionAdmin()
  if (!Number.isInteger(id)) err(400, "Invalid order id.")
  const o = await db.order.findUnique({ where: { id } })
  if (!o) err(404, "Order not found.")
  const customer = await db.user.findUnique({ where: { id: o!.userId } })
  return {
    id: o!.id, userEmail: customer?.email ?? o!.userId,
    productName: o!.productName, price: Number(o!.price), quantity: o!.quantity,
    status: o!.status, supplier: o!.supplier ?? "hotmail143",
    externalOrderId: o!.externalOrderId ?? "", purchasedAt: o!.purchasedAt.toISOString(),
    deliveredEmail: o!.deliveredEmail ?? "", deliveredPassword: o!.deliveredPassword ?? "",
    deliveredRefreshToken: o!.deliveredRefreshToken ?? "", deliveredClientId: o!.deliveredClientId ?? "",
    deliveredCredentials: o!.deliveredCredentials ?? "",
  }
}

export async function completeOrder(id: number) {
  await requireActionAdmin()
  if (!Number.isInteger(id)) err(400, "Invalid order id.")
  const fulfilled = await fulfill(id)
  revalidatePath("/admin/orders"); revalidatePath(`/admin/orders/${id}`)
  return {
    success: true as const,
    message: `Order fulfilled — ${fulfilled.accounts.length} account(s) delivered.`,
    remainingBalance: fulfilled.remainingBalance,
    accounts: fulfilled.accounts,
  }
}

export async function getProcessingOrdersCount() {
  try {
    await requireActionAdmin()
    const count = await db.order.count({ where: { status: { in: ["pending", "processing"] } } })
    return { count }
  } catch {
    return { count: 0 }
  }
}

export async function deliverCustomProduct(
  orderId: number,
  credentials: Array<{ email: string; password: string; refresh_token?: string; client_id?: string }>
) {
  try {
    await requireActionAdmin()
    if (!Number.isInteger(orderId)) err(400, "Invalid order ID.")
    if (!credentials || !Array.isArray(credentials) || credentials.length === 0) {
      err(400, "At least one credential is required.")
    }
    for (const cred of credentials) {
      if (!cred.email || !cred.password) err(400, "Each credential must have email and password.")
    }
    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) err(404, "Order not found.")
    if (order!.supplier !== "custom") err(400, "This order is not a custom product.")
    if (order!.status === "completed" && order!.deliveredCredentials) err(400, "This order has already been delivered.")
    const firstCred = credentials[0]
    await db.order.update({
      where: { id: orderId },
      data: {
        status: "completed",
        deliveredEmail: firstCred.email, deliveredPassword: firstCred.password,
        deliveredRefreshToken: firstCred.refresh_token ?? null,
        deliveredClientId: firstCred.client_id ?? null,
        deliveredCredentials: JSON.stringify(credentials),
        supplier: "custom",
      },
    })
    try {
      await notify(order!.userId, "order_completed", "Custom Product Delivered", `Your custom product for order #${orderId} (${order!.productName}) has been delivered. Check your dashboard for credentials.`)
    } catch { /* ignore */ }
    revalidatePath("/admin/orders"); revalidatePath(`/admin/orders/${orderId}`)
    return { success: true as const, message: `Custom product delivered successfully with ${credentials.length} account(s).` }
  } catch (e) {
    return actionError(e, "Could not deliver custom product.")
  }
}

export async function rejectCustomProduct(orderId: number) {
  try {
    await requireActionAdmin()
    if (!Number.isInteger(orderId)) err(400, "Invalid order ID.")
    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) err(404, "Order not found.")
    if (order.supplier !== "custom") err(400, "This order is not a custom product.")
    if (order.status !== "processing") err(400, "Only processing orders can be rejected.")
    const unitPrice = Number(order.price)
    const qty = order.quantity ?? 1
    const total = Number((unitPrice * qty).toFixed(2))
    await db.$transaction(async (tx) => {
      const updated = await tx.wallet.updateMany({
        where: { userId: order.userId },
        data: { balance: { increment: total }, updatedAt: new Date() },
      })
      if (updated.count === 0) throw new Error("Wallet not found for refund.")
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: order.userId } })
      const nextBalance = Number(wallet.balance)
      await tx.transaction.create({
        data: {
          userId: order.userId, type: "refund",
          description: `Refund for rejected custom order #${order.id} (${order.productName})`,
          amount: total.toFixed(2), balanceAfter: nextBalance.toFixed(2), status: "completed",
        },
      })
      await tx.order.update({ where: { id: orderId }, data: { status: "failed" } })
      if (order.productId) {
        await tx.product.update({ where: { id: order.productId }, data: { stock: { increment: qty } } })
      }
    })
    try {
      await notify(order.userId, "info", "Custom Order Rejected — Refunded", `Your custom order #${orderId} (${order.productName}) was rejected. ${total.toFixed(2)} has been refunded to your wallet.`)
    } catch { /* ignore */ }
    revalidatePath("/admin/orders"); revalidatePath(`/admin/orders/${orderId}`)
    return { success: true as const, message: `Custom order rejected and ${total.toFixed(2)} refunded to customer.` }
  } catch (e) {
    return actionError(e, "Could not reject custom product.")
  }
}

// --- Activity / transactions ---------------------------------------------------

export async function getRecentActivity(limit = 8) {
  await requireActionAdmin()
  const parsed = Number.isFinite(limit) ? limit : 8
  const lim = Math.min(100, Math.max(1, parsed))
  const [transactions, deposits] = await Promise.all([
    db.transaction.findMany({ orderBy: { createdAt: "desc" }, take: lim, select: { id: true, userId: true, type: true, amount: true, createdAt: true } }),
    db.depositRequest.findMany({ where: { status: "pending" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, userId: true, amount: true, createdAt: true } }),
  ])
  const userIds = [...new Set([...transactions.map((t) => t.userId), ...deposits.map((d) => d.userId)])]
  const users = userIds.length > 0 ? await db.user.findMany({ where: { id: { in: userIds } } }) : []
  const emailByUserId = new Map(users.map((u) => [u.id, u.email]))
  const events = [
    ...transactions.map((t) => ({ kind: t.type, userEmail: emailByUserId.get(t.userId) ?? t.userId, amount: Number(t.amount), pending: false, createdAt: t.createdAt.toISOString() })),
    ...deposits.map((d) => ({ kind: "deposit_request", userEmail: emailByUserId.get(d.userId) ?? d.userId, amount: Number(d.amount), pending: true, createdAt: d.createdAt.toISOString() })),
  ]
  events.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return events.slice(0, lim)
}

export async function listTransactions(type?: string) {
  await requireActionAdmin()
  const rows = await db.transaction.findMany({
    where: type ? { type } : undefined,
    orderBy: { createdAt: "desc" },
    take: 500,
  })
  const userIds = [...new Set(rows.map((r) => r.userId))]
  const users = userIds.length > 0 ? await db.user.findMany({ where: { id: { in: userIds } } }) : []
  const emailByUserId = new Map(users.map((u) => [u.id, u.email]))
  return rows.map((t) => ({
    id: t.id, userEmail: emailByUserId.get(t.userId) ?? t.userId,
    type: t.type, description: t.description ?? "", amount: Number(t.amount),
    balanceAfter: Number(t.balanceAfter), status: t.status, createdAt: t.createdAt.toISOString(),
  }))
}

// --- Admin support ---------------------------------------------------------------

export async function listSupportConversations() {
  await requireActionAdmin()
  const grouped = await db.supportMessage.groupBy({ by: ["userId"], _count: { _all: true }, _max: { id: true } })
  if (grouped.length === 0) return []
  const maxIds = grouped.map((g) => g._max.id).filter((v): v is number => v != null)
  const [lastMessages, unreadGroups] = await Promise.all([
    maxIds.length > 0 ? db.supportMessage.findMany({ where: { id: { in: maxIds } } }) : [],
    db.supportMessage.groupBy({ by: ["userId"], _count: { _all: true }, where: { sender: "customer", read: false } }),
  ])
  const lastByUser = new Map(lastMessages.map((m) => [m.userId, m]))
  const unreadByUser = new Map(unreadGroups.map((g) => [g.userId, g._count._all]))
  const totalByUser = new Map(grouped.map((g) => [g.userId, g._count._all]))
  const userIds = [...lastByUser.keys()]
  const users = userIds.length > 0 ? await db.user.findMany({ where: { id: { in: userIds } } }) : []
  const emailByUserId = new Map(users.map((u) => [u.id, u.email]))
  const nameByUserId = new Map(users.map((u) => [u.id, u.name]))
  return [...lastByUser.entries()]
    .map(([userId, last]) => ({
      userId, userEmail: emailByUserId.get(userId) ?? userId, userName: nameByUserId.get(userId) ?? "",
      lastText: last.text, lastSender: last.sender, lastAt: last.createdAt.toISOString(),
      unread: unreadByUser.get(userId) ?? 0, total: totalByUser.get(userId) ?? 0,
    }))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}

export async function getSupportThread(userId: string) {
  await requireActionAdmin()
  if (!userId) err(400, "userId is required.")
  const user = await db.user.findUnique({ where: { id: userId } })
  const [rows] = await Promise.all([
    db.supportMessage.findMany({ where: { userId }, orderBy: { id: "asc" }, take: 500 }),
    db.supportMessage.updateMany({ where: { userId, sender: "customer", read: false }, data: { read: true } }),
  ])
  return {
    userId, userEmail: user?.email ?? userId, userName: user?.name ?? "",
    messages: rows.map((m) => ({ id: m.id, userId: m.userId, sender: m.sender, text: m.text, read: m.read, createdAt: m.createdAt.toISOString() })),
  }
}

export async function replySupportMessage(userId: string, text: string) {
  await requireActionAdmin()
  if (!userId) err(400, "userId is required.")
  const clean = typeof text === "string" ? text.trim() : ""
  if (!clean) err(400, "Message cannot be empty.")
  if (clean.length > 2000) err(400, "Message is too long (max 2000 characters).")
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) err(400, "User not found.")
  const created = await db.supportMessage.create({ data: { userId, sender: "admin", text: clean } })
  revalidatePath("/admin/support")
  return {
    success: true as const,
    message: { id: created.id, userId: created.userId, sender: created.sender, text: created.text, read: created.read, createdAt: created.createdAt.toISOString() },
  }
}

export async function getSupportUnreadCount() {
  try {
    await requireActionAdmin()
    const unread = await db.supportMessage.count({ where: { sender: "customer", read: false } })
    return { unread }
  } catch {
    return { unread: 0 }
  }
}

// --- Content: features & FAQs & testimonials ------------------------------------

function coerceOptionalId(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined
  const n = typeof v === "number" ? v : Number(v)
  if (!Number.isInteger(n)) err(400, "id must be an integer.")
  return n
}

export async function listFeatures() {
  await requireActionAdmin()
  return db.feature.findMany({ orderBy: { sortOrder: "asc" } })
}

export async function listLandingFeatures() {
  return db.feature.findMany({ orderBy: { sortOrder: "asc" } })
}

export async function upsertFeature(input: { id?: number; icon: string; title: string; description: string }) {
  try {
    await requireActionAdmin()
    const id = coerceOptionalId(input.id)
    if (typeof input.icon !== "string" || input.icon.length > 40) err(400, "icon must be a string of max 40 characters.")
    if (typeof input.title !== "string" || input.title.length < 1 || input.title.length > 120) err(400, "title must be a string of 1-120 characters.")
    if (typeof input.description !== "string" || input.description.length < 1 || input.description.length > 1000) err(400, "description must be a string of 1-1000 characters.")
    try {
      if (id) {
        await db.feature.update({ where: { id }, data: { icon: input.icon, title: input.title, description: input.description } })
      } else {
        const last = await db.feature.findFirst({ orderBy: { sortOrder: "desc" } })
        await db.feature.create({ data: { icon: input.icon, title: input.title, description: input.description, sortOrder: (last?.sortOrder ?? -1) + 1 } })
      }
    } catch (error) {
      if (isPrismaNotFound(error)) err(404, "Feature not found.")
      throw error
    }
    revalidatePath("/admin/settings"); revalidatePath("/")
    return { success: true as const }
  } catch (e) {
    return actionError(e, "Could not save feature.")
  }
}

export async function deleteFeature(id: number) {
  try {
    await requireActionAdmin()
    if (!Number.isInteger(id)) err(400, "Validation failed (numeric string is expected).")
    let row
    try {
      row = await db.feature.delete({ where: { id } })
    } catch (error) {
      if (isPrismaNotFound(error)) err(404, "Feature not found.")
      throw error
    }
    await db.feature.updateMany({ data: { sortOrder: { decrement: 1 } }, where: { sortOrder: { gt: row!.sortOrder } } })
    revalidatePath("/admin/settings"); revalidatePath("/")
    return { success: true as const }
  } catch (e) {
    return actionError(e, "Could not delete feature.")
  }
}

export async function moveFeature(id: number, direction: "up" | "down") {
  try {
    await requireActionAdmin()
    if (!Number.isInteger(id)) err(400, "Validation failed (numeric string is expected).")
    if (direction !== "up" && direction !== "down") err(400, 'direction must be one of "up", "down".')
    const rows = await db.feature.findMany({ orderBy: { sortOrder: "asc" } })
    const index = rows.findIndex((r) => r.id === id)
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= rows.length) return { success: false as const }
    await db.$transaction([
      db.feature.update({ where: { id: rows[index].id }, data: { sortOrder: swapIndex } }),
      db.feature.update({ where: { id: rows[swapIndex].id }, data: { sortOrder: index } }),
    ])
    revalidatePath("/admin/settings"); revalidatePath("/")
    return { success: true as const }
  } catch (e) {
    return actionError(e, "Could not move feature.")
  }
}

export async function listFaqs() {
  await requireActionAdmin()
  return db.faq.findMany({ orderBy: { sortOrder: "asc" } })
}

export async function listLandingFaqs() {
  return db.faq.findMany({ orderBy: { sortOrder: "asc" } })
}

export async function upsertFaq(input: { id?: number; question: string; answer: string }) {
  try {
    await requireActionAdmin()
    const id = coerceOptionalId(input.id)
    if (typeof input.question !== "string" || input.question.length < 1 || input.question.length > 300) err(400, "question must be a string of 1-300 characters.")
    if (typeof input.answer !== "string" || input.answer.length < 1 || input.answer.length > 2000) err(400, "answer must be a string of 1-2000 characters.")
    try {
      if (id) {
        await db.faq.update({ where: { id }, data: { question: input.question, answer: input.answer } })
      } else {
        const last = await db.faq.findFirst({ orderBy: { sortOrder: "desc" } })
        await db.faq.create({ data: { question: input.question, answer: input.answer, sortOrder: (last?.sortOrder ?? -1) + 1 } })
      }
    } catch (error) {
      if (isPrismaNotFound(error)) err(404, "FAQ not found.")
      throw error
    }
    revalidatePath("/admin/settings"); revalidatePath("/")
    return { success: true as const }
  } catch (e) {
    return actionError(e, "Could not save FAQ.")
  }
}

export async function deleteFaq(id: number) {
  try {
    await requireActionAdmin()
    if (!Number.isInteger(id)) err(400, "Validation failed (numeric string is expected).")
    let row
    try {
      row = await db.faq.delete({ where: { id } })
    } catch (error) {
      if (isPrismaNotFound(error)) err(404, "FAQ not found.")
      throw error
    }
    await db.faq.updateMany({ data: { sortOrder: { decrement: 1 } }, where: { sortOrder: { gt: row!.sortOrder } } })
    revalidatePath("/admin/settings"); revalidatePath("/")
    return { success: true as const }
  } catch (e) {
    return actionError(e, "Could not delete FAQ.")
  }
}

export async function moveFaq(id: number, direction: "up" | "down") {
  try {
    await requireActionAdmin()
    if (!Number.isInteger(id)) err(400, "Validation failed (numeric string is expected).")
    if (direction !== "up" && direction !== "down") err(400, 'direction must be one of "up", "down".')
    const rows = await db.faq.findMany({ orderBy: { sortOrder: "asc" } })
    const index = rows.findIndex((r) => r.id === id)
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= rows.length) return { success: false as const }
    await db.$transaction([
      db.faq.update({ where: { id: rows[index].id }, data: { sortOrder: swapIndex } }),
      db.faq.update({ where: { id: rows[swapIndex].id }, data: { sortOrder: index } }),
    ])
    revalidatePath("/admin/settings"); revalidatePath("/")
    return { success: true as const }
  } catch (e) {
    return actionError(e, "Could not move FAQ.")
  }
}

export async function listTestimonials() {
  await requireActionAdmin()
  return db.testimonial.findMany({ orderBy: { sortOrder: "asc" } })
}

export async function listLandingTestimonials() {
  return db.testimonial.findMany({ orderBy: { sortOrder: "asc" } })
}

export async function upsertTestimonial(input: {
  id?: number; stars?: number; tag?: string; quote: string; name: string; role?: string; avatar?: string
}) {
  try {
    await requireActionAdmin()
    const id = coerceOptionalId(input.id)
    let stars: number | undefined
    if (input.stars !== undefined && input.stars !== null) {
      const n = typeof input.stars === "number" ? input.stars : Number(input.stars)
      if (!Number.isInteger(n)) err(400, "stars must be an integer.")
      stars = n
    }
    const tag = input.tag === undefined || input.tag === null ? undefined : optStrMax(input.tag, 60, "tag")
    if (typeof input.quote !== "string" || input.quote.length < 1 || input.quote.length > 1000) err(400, "quote must be a string of 1-1000 characters.")
    if (typeof input.name !== "string" || input.name.length < 1 || input.name.length > 120) err(400, "name must be a string of 1-120 characters.")
    const role = input.role === undefined || input.role === null ? undefined : optStrMax(input.role, 160, "role")
    const avatar = input.avatar === undefined || input.avatar === null ? undefined : optStrMax(input.avatar, 500, "avatar")
    const data = {
      stars: Math.min(5, Math.max(1, Math.round(stars ?? 5))),
      tag: tag?.trim() || "", quote: input.quote, name: input.name,
      role: role?.trim() || "", avatar: avatar?.trim() || "",
    }
    if (id) {
      try {
        await db.testimonial.update({ where: { id }, data })
      } catch (error) {
        if (isPrismaNotFound(error)) err(404, "Testimonial not found.")
        throw error
      }
    } else {
      const last = await db.testimonial.findFirst({ orderBy: { sortOrder: "desc" } })
      await db.testimonial.create({ data: { ...data, sortOrder: (last?.sortOrder ?? -1) + 1 } })
    }
    revalidatePath("/admin/settings"); revalidatePath("/")
    return { success: true as const }
  } catch (e) {
    return actionError(e, "Could not save testimonial.")
  }
}

export async function deleteTestimonial(id: number) {
  try {
    await requireActionAdmin()
    if (!Number.isInteger(id)) err(400, "Validation failed (numeric string is expected).")
    let row
    try {
      row = await db.testimonial.delete({ where: { id } })
    } catch (error) {
      if (isPrismaNotFound(error)) err(404, "Testimonial not found.")
      throw error
    }
    await db.testimonial.updateMany({ data: { sortOrder: { decrement: 1 } }, where: { sortOrder: { gt: row!.sortOrder } } })
    revalidatePath("/admin/settings"); revalidatePath("/")
    return { success: true as const }
  } catch (e) {
    return actionError(e, "Could not delete testimonial.")
  }
}

export async function moveTestimonial(id: number, direction: "up" | "down") {
  try {
    await requireActionAdmin()
    if (!Number.isInteger(id)) err(400, "Validation failed (numeric string is expected).")
    if (direction !== "up" && direction !== "down") err(400, 'direction must be one of "up", "down".')
    const rows = await db.testimonial.findMany({ orderBy: { sortOrder: "asc" } })
    const index = rows.findIndex((r) => r.id === id)
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= rows.length) return { success: false as const }
    await db.$transaction([
      db.testimonial.update({ where: { id: rows[index].id }, data: { sortOrder: swapIndex } }),
      db.testimonial.update({ where: { id: rows[swapIndex].id }, data: { sortOrder: index } }),
    ])
    revalidatePath("/admin/settings"); revalidatePath("/")
    return { success: true as const }
  } catch (e) {
    return actionError(e, "Could not move testimonial.")
  }
}

// --- Suppliers -----------------------------------------------------------------

export async function getHotmailBalance(): Promise<
  { ok: true; balance: number; email?: string } | { ok: false; message: string }
> {
  try {
    await requireActionAdmin()
    const res = await fetchHotmailBalance()
    return { ok: true, balance: res.balance, email: res.email }
  } catch (e) {
    return { ok: false, message: actionErrorMessage(e, "Could not fetch balance.") }
  }
}

export async function getHotmailStock(): Promise<
  { ok: true; data: Record<string, unknown> } | { ok: false; message: string }
> {
  try {
    await requireActionAdmin()
    const res = await fetchHotmailStock()
    return { ok: true, data: res as unknown as Record<string, unknown> }
  } catch (e) {
    return { ok: false, message: actionErrorMessage(e, "Could not fetch stock.") }
  }
}

export async function updateHotmailConfig(input: { apiKey?: string; baseUrl?: string }) {
  try {
    await requireActionAdmin()
    const data: { hotmailApiKey?: string | null; hotmailApiBaseUrl?: string | null } = {}
    if (input.apiKey !== undefined) {
      if (typeof input.apiKey !== "string" || input.apiKey.length > 200) err(400, "apiKey must be a string of at most 200 characters.")
      data.hotmailApiKey = input.apiKey || null
    }
    if (input.baseUrl !== undefined) {
      if (typeof input.baseUrl !== "string" || input.baseUrl.length > 500) err(400, "baseUrl must be a string of at most 500 characters.")
      if (input.baseUrl) {
        try {
          const url = new URL(input.baseUrl)
          if (!url.protocol.startsWith("http")) err(400, "baseUrl must be a valid URL.")
        } catch {
          err(400, "baseUrl must be a valid URL.")
        }
      }
      data.hotmailApiBaseUrl = input.baseUrl || null
    }
    await db.siteSetting.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data })
    revalidatePath("/admin/settings"); revalidatePath("/admin/products")
    return { success: true as const }
  } catch (e) {
    return { success: false as const, message: actionErrorMessage(e, "Could not save Hotmail143 config.") }
  }
}

export async function getHotmailProducts() {
  const res = await withAction(async () => {
    await requireActionAdmin()
    return listHotmailProducts()
  }, "Could not fetch products.")
  if (isFail(res)) return { ok: false as const, message: res.message }
  return { ok: true as const, products: res }
}

export async function getBulkmailBalance() {
  const res = await withAction(async () => {
    await requireActionAdmin()
    const [bal, settings] = await Promise.all([
      getBulkMailBalance(),
      db.siteSetting.findUnique({ where: { id: 1 } }),
    ])
    const currency = settings?.currencySymbol ?? "BDT"
    const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1
    const fx = await getUsdToLocalRate(currency, manual, settings?.fxLiveEnabled ?? true)
    const balanceUsd = Number(bal.balance ?? 0)
    return {
      balance: Number((balanceUsd * fx.rate).toFixed(2)),
      balanceUsd, currency, email: bal.email ?? "",
      rate: fx.rate, rateSource: fx.source, fetchedAt: fx.fetchedAt,
    }
  }, "Could not fetch balance.")
  if (isFail(res)) return res
  return { ok: true as const, ...res }
}

/** Effective USD → local rate (live internet rate, flat value, or manual fallback). */
export async function getFxRate(): Promise<{ rate: number; source: string; liveEnabled: boolean; currency: string }> {
  try {
    await requireActionAdmin()
    const settings = await db.siteSetting.findUnique({ where: { id: 1 } })
    const currency = settings?.currencySymbol ?? "BDT"
    const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1
    const liveEnabled = settings?.fxLiveEnabled ?? true
    const fx = await getUsdToLocalRate(currency, manual, liveEnabled)
    return { rate: fx.rate, source: fx.source, liveEnabled, currency }
  } catch {
    return { rate: 1, source: "manual", liveEnabled: true, currency: "BDT" }
  }
}

/** Switches the USD → local rate between live internet rate and the flat value. */
export async function updateFxMode(live: boolean) {
  try {
    await requireActionAdmin()
    if (typeof live !== "boolean") err(400, "live must be a boolean.")
    await db.siteSetting.upsert({ where: { id: 1 }, create: { id: 1, fxLiveEnabled: live }, update: { fxLiveEnabled: live } })
    revalidatePath("/admin/settings"); revalidatePath("/admin/products"); revalidatePath("/admin")
    return { success: true as const, message: live ? "Live internet rate enabled." : "Flat rate enabled." }
  } catch (e) {
    return { success: false as const, message: actionErrorMessage(e, "Could not switch rate mode.") }
  }
}

export async function getBulkmailStock() {
  const res = await withAction(async () => {
    await requireActionAdmin()
    return getBulkMailStock()
  }, "Could not fetch stock.")
  if (isFail(res)) return res
  return { ok: true as const, data: res as unknown }
}

export async function updateBulkmailConfig(input: { apiKey?: string; baseUrl?: string }) {
  try {
    await requireActionAdmin()
    const data: { bulkmailApiKey?: string | null; bulkmailApiBaseUrl?: string | null } = {}
    if (input.apiKey !== undefined) {
      if (typeof input.apiKey !== "string" || input.apiKey.length > 200) err(400, "apiKey must be a string of at most 200 characters.")
      data.bulkmailApiKey = input.apiKey || null
    }
    if (input.baseUrl !== undefined) {
      if (typeof input.baseUrl !== "string" || input.baseUrl.length > 500) err(400, "baseUrl must be a string of at most 500 characters.")
      if (input.baseUrl) {
        try {
          const url = new URL(input.baseUrl)
          if (!url.protocol.startsWith("http")) err(400, "baseUrl must be a valid URL.")
        } catch {
          err(400, "baseUrl must be a valid URL.")
        }
      }
      data.bulkmailApiBaseUrl = input.baseUrl || null
    }
    await db.siteSetting.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data })
    revalidatePath("/admin/settings"); revalidatePath("/admin/products")
    return { success: true as const }
  } catch (e) {
    return { success: false as const, message: actionErrorMessage(e, "Could not save BulkMail config.") }
  }
}

export async function getBulkmailProducts() {
  const res = await withAction(async () => {
    await requireActionAdmin()
    return listBulkMailProducts()
  }, "Could not fetch products.")
  if (isFail(res)) return { ok: false as const, message: res.message }
  return { ok: true as const, products: res }
}

export async function getBulkmailCatalog(params?: {
  page?: number; perPage?: number; search?: string; inStock?: boolean; sort?: string; order?: string
}) {
  try {
    await requireActionAdmin()
    const pageRaw = Number(params?.page ?? "1")
  const perPageRaw = Number(params?.perPage ?? "10")
  const search = params?.search?.trim() || undefined
  const inStock = params?.inStock
  const sortRaw = params?.sort ?? undefined
  const sort = ["name", "price", "stock_quantity", "created_at"].includes(sortRaw ?? "") ? sortRaw : undefined
  const orderRaw = params?.order ?? undefined
  const order = orderRaw === "asc" || orderRaw === "desc" ? orderRaw : undefined

  const [all, settings] = await Promise.all([
    listAllBulkMailCatalogProducts(),
    db.siteSetting.findUnique({ where: { id: 1 } }),
  ])
  const currency = settings?.currencySymbol ?? "BDT"
  const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1
  const fx = await getUsdToLocalRate(currency, manual, settings?.fxLiveEnabled ?? true)
  const toBdt = (usd: number) => Number((usd * fx.rate).toFixed(2))

  let items = all
  if (inStock) items = items.filter((c) => c.inStock && c.stock > 0)
  const q = search?.toLowerCase()
  if (q) {
    items = items.filter(
      (c) => c.name.toLowerCase().includes(q) || c.sku.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || String(c.productId) === q,
    )
  }
  const dir = order === "desc" ? -1 : 1
  const sorted = [...items].sort((a, b) => {
    switch (sort) {
      case "price": return (a.price - b.price) * dir
      case "stock_quantity": return (a.stock - b.stock) * dir
      case "created_at": return (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0) * dir
      default: return a.name.localeCompare(b.name) * dir
    }
  })
  const perPage = Math.min(100, Math.max(1, Number.isFinite(perPageRaw) ? perPageRaw : 10))
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const page = Number.isFinite(pageRaw) ? pageRaw : 1
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const slice = sorted.slice((currentPage - 1) * perPage, currentPage * perPage)
  return {
    ok: true as const,
    items: slice.map((c) => ({
      ...c,
      priceBdt: toBdt(c.price),
      basePriceBdt: toBdt(c.basePrice),
      bulkTiersBdt: c.bulkTiers.map((t) => ({ min_quantity: t.min_quantity, price: t.price, priceBdt: toBdt(t.price) })),
    })),
    meta: { current_page: currentPage, per_page: perPage, total: sorted.length, total_pages: totalPages },
    currency, rate: fx.rate, rateSource: fx.source,
  }
  } catch (e) {
    return { ok: false as const, message: actionErrorMessage(e, "Could not fetch catalog.") }
  }
}

export async function getBulkmailCatalogProduct(id: number) {
  try {
    await requireActionAdmin()
    if (!Number.isInteger(id) || id < 1) err(400, "Invalid BulkMail product id.")
  const [preview, settings] = await Promise.all([
    getBulkMailPricePreview(id),
    db.siteSetting.findUnique({ where: { id: 1 } }),
  ])
  const currency = settings?.currencySymbol ?? "BDT"
  const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1
  const fx = await getUsdToLocalRate(currency, manual)
  const toBdt = (usd: number) => Number((usd * fx.rate).toFixed(2))
  return {
    ok: true as const,
    product: { ...preview.product, priceBdt: toBdt(preview.product.price), basePriceBdt: toBdt(preview.product.basePrice) },
    tiers: preview.product.bulkTiers.map((t) => ({ min_quantity: t.min_quantity, price: t.price, priceBdt: toBdt(t.price) })),
    previews: preview.previews.map((p) => ({
      quantity: p.quantity, unitPrice: p.unit_price, totalPrice: p.total_price,
      unitPriceBdt: toBdt(p.unit_price), totalPriceBdt: toBdt(p.total_price),
      discountApplied: p.discount_applied, savings: p.savings, savingsBdt: toBdt(p.savings),
    })),
    currency, rate: fx.rate, rateSource: fx.source,
  }
  } catch (e) {
    return { ok: false as const, message: actionErrorMessage(e, "Could not fetch product details.") }
  }
}

export async function listBulkmailOrders(params?: { page?: number; perPage?: number; status?: string }) {
  try {
    await requireActionAdmin()
    const pageRaw = Number(params?.page ?? "1")
  const perPageRaw = Number(params?.perPage ?? "20")
  const statusRaw = params?.status ?? undefined
  const status = ["pending", "processing", "completed", "cancelled"].includes(statusRaw ?? "") ? statusRaw : undefined
  const [list, settings] = await Promise.all([
    listBulkMailOrders({ page: Number.isFinite(pageRaw) ? pageRaw : 1, perPage: Number.isFinite(perPageRaw) ? perPageRaw : 20, status }),
    db.siteSetting.findUnique({ where: { id: 1 } }),
  ])
  const currency = settings?.currencySymbol ?? "BDT"
  const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1
  const fx = await getUsdToLocalRate(currency, manual, settings?.fxLiveEnabled ?? true)
  const toBdt = (usd: number) => Number((usd * fx.rate).toFixed(2))
  return {
    ok: true as const,
    items: list.items.map((o) => ({ ...o, totalAmountBdt: toBdt(o.totalAmount), unitPriceBdt: toBdt(o.unitPrice) })),
    meta: list.meta, currency, rate: fx.rate, rateSource: fx.source,
  }
  } catch (e) {
    return { ok: false as const, message: actionErrorMessage(e, "Could not fetch supplier orders.") }
  }
}

export async function getBulkmailOrder(id: number) {
  try {
    await requireActionAdmin()
    if (!Number.isInteger(id)) err(400, "Invalid BulkMail order id.")
  const [order, settings] = await Promise.all([
    getBulkMailOrder(id),
    db.siteSetting.findUnique({ where: { id: 1 } }),
  ])
  const currency = settings?.currencySymbol ?? "BDT"
  const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1
  const fx = await getUsdToLocalRate(currency, manual, settings?.fxLiveEnabled ?? true)
  const toBdt = (usd: number) => Number((usd * fx.rate).toFixed(2))
  return {
    ok: true as const, ...order,
    totalAmountBdt: toBdt(order.totalAmount), unitPriceBdt: toBdt(order.unitPrice),
    currency, rate: fx.rate, rateSource: fx.source,
  }
  } catch (e) {
    return { ok: false as const, message: actionErrorMessage(e, "Could not fetch supplier order.") }
  }
}

export async function cancelBulkmailOrder(id: number) {
  try {
    await requireActionAdmin()
    if (!Number.isInteger(id)) err(400, "Invalid BulkMail order id.")
  const [result, settings] = await Promise.all([
    cancelBulkMailOrder(id),
    db.siteSetting.findUnique({ where: { id: 1 } }),
  ])
  const currency = settings?.currencySymbol ?? "BDT"
  const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1
  const fx = await getUsdToLocalRate(currency, manual, settings?.fxLiveEnabled ?? true)
  revalidatePath("/admin/orders")
  return {
    ok: true as const,
    success: true as const,
    message: result.message,
    refundedAmount: result.refundedAmount,
    refundedAmountBdt: Number((result.refundedAmount * fx.rate).toFixed(2)),
    currency,
  }
  } catch (e) {
    return { ok: false as const, message: actionErrorMessage(e, "Could not cancel supplier order.") }
  }
}

export async function exportBulkmailOrder(id: number, format: "txt" | "csv" | "json" = "txt") {
  try {
    await requireActionAdmin()
    if (!Number.isInteger(id)) err(400, "Invalid BulkMail order id.")
    const fmt = format === "csv" || format === "json" ? format : "txt"
    const { contentType, content } = await exportBulkMailOrder(id, fmt)
    const ext = fmt === "csv" ? "csv" : fmt === "json" ? "json" : "txt"
    return { ok: true as const, content, contentType, filename: `bulkmail-order-${id}.${ext}` }
  } catch (e) {
    return { ok: false as const, message: actionErrorMessage(e, "Could not export supplier order.") }
  }
}

void CONFIG
