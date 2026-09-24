"use server"

import { revalidatePath } from "next/cache"

import { serverApi } from "@/lib/api/endpoints"
import { clearAdminSession, createAdminSession } from "@/lib/admin-auth"
import { isFail, withAction } from "@/lib/action"

export async function adminLogin(password: string) {
  const result = await serverApi.admin.login(password)
  // The middleware (proxy.ts) gates /admin* on the local HMAC cookie, while
  // the API sets its own httpOnly cookie. Set the local cookie here so a
  // successful Nest login actually passes the proxy gate (fixes login loop).
  if (result.success) {
    try {
      await createAdminSession()
    } catch {
      return { success: false, message: "Server is misconfigured (admin secret missing)." }
    }
  }
  return result
}

export async function adminLogout() {
  const result = await serverApi.admin.logout()
  await clearAdminSession()
  return result
}

// --- Overview ----------------------------------------------------------------

export async function getAdminOverview() {
  return serverApi.admin.overview()
}

// --- Products ------------------------------------------------------------------

export async function listProducts(section?: string) {
  return serverApi.admin.products(section)
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
  const result = await serverApi.admin.upsertProduct(input)
  revalidatePath("/admin/products")
  revalidatePath("/")
  revalidatePath("/dashboard")
  return result
}

export async function deleteProduct(id: number) {
  const result = await serverApi.admin.deleteProduct(id)
  revalidatePath("/admin/products")
  return result
}

// --- Categories ---------------------------------------------------------------

export async function listCategories() {
  return serverApi.admin.categories.list()
}

export async function createCategory(name: string) {
  const result = await serverApi.admin.categories.create(name)
  revalidatePath("/admin/categories")
  revalidatePath("/dashboard")
  return result
}

export async function updateCategory(id: number, input: { name?: string; active?: boolean }) {
  const result = await serverApi.admin.categories.update(id, input)
  revalidatePath("/admin/categories")
  revalidatePath("/dashboard")
  return result
}

export async function deleteCategory(id: number) {
  const result = await serverApi.admin.categories.delete(id)
  revalidatePath("/admin/categories")
  revalidatePath("/dashboard")
  return result
}

export async function listPublicCategories() {
  return serverApi.catalog.categories()
}

// --- Payment methods -----------------------------------------------------------

export async function listPaymentMethods() {
  return serverApi.payments.methodsAll()
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
  const result = await serverApi.payments.upsert(input)
  revalidatePath("/admin/payment-methods")
  revalidatePath("/dashboard/pay")
  return result
}

export async function deletePaymentMethod(id: number) {
  const result = await serverApi.payments.remove(id)
  revalidatePath("/admin/payment-methods")
  return result
}

// --- Site settings -----------------------------------------------------------

export async function getAdminSettings() {
  return serverApi.admin.settings()
}

import { clearCurrencySymbolCache } from "@/lib/use-currency"

export async function updateAdminSettings(input: {
  currencySymbol: string
  usdToLocalRate: number
  minDepositUsd: number
  minTransferAmount: number
  initialBalance: number
  siteName: string
  supportUrl?: string
  heroTitle?: string
  heroSubtitle?: string
  footerText?: string
  heroBadge?: string
  aboutTitle?: string
  aboutSubtitle?: string
  aboutHeading?: string
  aboutPara1?: string
  aboutPara2?: string
  stat1Value?: string
  stat1Label?: string
  stat2Value?: string
  stat2Label?: string
  stat3Value?: string
  stat3Label?: string
  stat4Value?: string
  stat4Label?: string
  trustTitle?: string
  trustDesc?: string
  trustBullets?: string
  valuesTitle?: string
  valuesSubtitle?: string
  featuresTitle?: string
  featuresSubtitle?: string
  teamTitle?: string
  teamDescription?: string
  teamStat1Value?: string
  teamStat1Label?: string
  teamStat2Value?: string
  teamStat2Label?: string
  teamImageUrl?: string
  testimonialsTitle?: string
  testimonialsSubtitle?: string
  faqTitle?: string
  ctaBadge?: string
  ctaTitle?: string
  ctaSubtitle?: string
  contactPhone?: string
  contactSupportEmail?: string
  contactSalesEmail?: string
}) {
  try {
    const result = await serverApi.admin.updateSettings(input)
    clearCurrencySymbolCache()
    revalidatePath("/admin/settings")
    revalidatePath("/dashboard/pay")
    revalidatePath("/dashboard/deposit")
    revalidatePath("/")
    return result
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Could not save settings." }
  }
}

// --- Users / orders / transactions overview ------------------------------------

export async function listUsers() {
  return serverApi.admin.users()
}

export async function getUserDetails(userId: string) {
  return serverApi.admin.userDetails(userId)
}

export async function adjustUserBalance(userId: string, amount: number, note?: string) {
  const result = await serverApi.admin.adjustBalance(userId, amount, note)
  revalidatePath("/admin/users")
  revalidatePath(`/admin/users/${userId}`)
  revalidatePath("/dashboard")
  return result
}

export async function deleteUser(userId: string) {
  const result = await serverApi.admin.deleteUser(userId)
  revalidatePath("/admin/users")
  return result
}

export async function listAllOrders() {
  return serverApi.admin.orders()
}

export async function getProcessingOrdersCount() {
  try {
    return await serverApi.admin.ordersAttentionCount()
  } catch {
    return { count: 0 }
  }
}

export async function getHotmailBalance(): Promise<
  { ok: true; balance: number; email?: string } | { ok: false; message: string }
> {
  const res = await withAction(
    () => serverApi.admin.hotmail143.balance(),
    "Could not fetch balance.",
  )
  if (isFail(res)) return res
  return { ok: true, balance: res.balance, email: res.email }
}

export async function getHotmailStock(): Promise<
  { ok: true; data: Record<string, unknown> } | { ok: false; message: string }
> {
  const res = await withAction(() => serverApi.admin.hotmail143.stock(), "Could not fetch stock.")
  if (isFail(res)) return res
  return { ok: true, data: res.data }
}

export async function updateHotmailConfig(input: { apiKey?: string; baseUrl?: string }) {
  const res = await withAction(
    () => serverApi.admin.hotmail143.config(input),
    "Could not save Hotmail143 config.",
  )
  if (isFail(res)) return { success: false, message: res.message }
  revalidatePath("/admin/settings")
  revalidatePath("/admin/products")
  return res
}

export async function getHotmailProducts() {
  const res = await withAction(
    () => serverApi.admin.hotmail143.products(),
    "Could not fetch products.",
  )
  if (isFail(res)) return { ok: false as const, message: res.message }
  return { ok: true as const, products: res }
}

export async function getBulkmailBalance(): Promise<
  { ok: true; balance: number; balanceUsd?: number; email?: string; currency?: string; rate?: number; rateSource?: string } | { ok: false; message: string }
> {
  const res = await withAction(() => serverApi.admin.bulkmail.balance(), "Could not fetch balance.")
  if (isFail(res)) return res
  return { ok: true, balance: res.balance, balanceUsd: res.balanceUsd, email: res.email, currency: res.currency, rate: res.rate, rateSource: res.rateSource }
}

/** Effective USD → local rate (live internet rate, flat value, or manual fallback). */
export async function getFxRate(): Promise<{ rate: number; source: string; liveEnabled: boolean; currency: string }> {
  try {
    const data = await serverApi.admin.fx.rate()
    return {
      rate: Number(data.rate) > 0 ? Number(data.rate) : 1,
      source: data.source ?? "manual",
      liveEnabled: data.liveEnabled ?? true,
      currency: data.currency ?? "BDT",
    }
  } catch {
    return { rate: 1, source: "manual", liveEnabled: true, currency: "BDT" }
  }
}

/** Switches the USD → local rate between live internet rate and the flat value. */
export async function updateFxMode(live: boolean) {
  const res = await withAction(() => serverApi.admin.fx.mode(live), "Could not switch rate mode.")
  if (isFail(res)) return { success: false, message: res.message }
  revalidatePath("/admin/settings")
  revalidatePath("/admin/products")
  revalidatePath("/admin")
  return res
}

export async function getBulkmailStock(): Promise<
  { ok: true; data: unknown } | { ok: false; message: string }
> {
  const res = await withAction(() => serverApi.admin.bulkmail.stock(), "Could not fetch stock.")
  if (isFail(res)) return res
  return { ok: true, data: res }
}

export async function updateBulkmailConfig(input: { apiKey?: string; baseUrl?: string }) {
  const res = await withAction(
    () => serverApi.admin.bulkmail.config(input),
    "Could not save BulkMail config.",
  )
  if (isFail(res)) return { success: false, message: res.message }
  revalidatePath("/admin/settings")
  revalidatePath("/admin/products")
  return res
}

export async function getBulkmailProducts() {
  const res = await withAction(
    () => serverApi.admin.bulkmail.products(),
    "Could not fetch products.",
  )
  if (isFail(res)) return { ok: false as const, message: res.message }
  return { ok: true as const, products: res }
}

export async function getBulkmailCatalog(params?: {
  page?: number
  perPage?: number
  search?: string
  inStock?: boolean
  sort?: string
  order?: string
}) {
  const res = await withAction(
    () => serverApi.admin.bulkmail.catalog(params),
    "Could not fetch catalog.",
  )
  if (isFail(res)) return { ok: false as const, message: res.message }
  return { ok: true as const, ...res }
}

export async function getBulkmailCatalogProduct(id: number) {
  const res = await withAction(
    () => serverApi.admin.bulkmail.catalogProduct(id),
    "Could not fetch product details.",
  )
  if (isFail(res)) return { ok: false as const, message: res.message }
  return { ok: true as const, ...res }
}

export async function listBulkmailOrders(params?: { page?: number; perPage?: number; status?: string }) {
  const res = await withAction(
    () => serverApi.admin.bulkmail.orders.list(params),
    "Could not fetch supplier orders.",
  )
  if (isFail(res)) return { ok: false as const, message: res.message }
  return { ok: true as const, ...res }
}

export async function getBulkmailOrder(id: number) {
  const res = await withAction(
    () => serverApi.admin.bulkmail.orders.get(id),
    "Could not fetch supplier order.",
  )
  if (isFail(res)) return { ok: false as const, message: res.message }
  return { ok: true as const, ...res }
}

export async function cancelBulkmailOrder(id: number) {
  const res = await withAction(
    () => serverApi.admin.bulkmail.orders.cancel(id),
    "Could not cancel supplier order.",
  )
  if (isFail(res)) return { ok: false as const, message: res.message }
  revalidatePath("/admin/orders")
  return { ok: true as const, ...res }
}

export async function exportBulkmailOrder(id: number, format: "txt" | "csv" | "json" = "txt") {
  const res = await withAction(
    () => serverApi.admin.bulkmail.orders.export(id, format),
    "Could not export supplier order.",
  )
  if (isFail(res)) return { ok: false as const, message: res.message }
  return { ok: true as const, ...res }
}

export async function getRecentActivity(limit = 8) {
  return serverApi.admin.activity(limit)
}

export async function listSupportConversations() {
  return serverApi.admin.support.conversations()
}

export async function getSupportThread(userId: string) {
  return serverApi.admin.support.thread(userId)
}

export async function replySupportMessage(userId: string, text: string) {
  const result = await serverApi.admin.support.reply(userId, text)
  revalidatePath("/admin/support")
  return result
}

export async function getSupportUnreadCount() {
  try {
    return await serverApi.admin.support.unreadCount()
  } catch {
    return { unread: 0 }
  }
}

// --- Content: features & FAQs ---------------------------------------------------

export async function listFeatures() {
  return serverApi.content.features()
}

export async function upsertFeature(input: {
  id?: number
  icon: string
  title: string
  description: string
}) {
  const result = await serverApi.content.upsertFeature(input)
  revalidatePath("/admin/settings")
  revalidatePath("/")
  return result
}

export async function deleteFeature(id: number) {
  const result = await serverApi.content.deleteFeature(id)
  revalidatePath("/admin/settings")
  revalidatePath("/")
  return result
}

export async function moveFeature(id: number, direction: "up" | "down") {
  const result = await serverApi.content.moveFeature(id, direction)
  revalidatePath("/admin/settings")
  revalidatePath("/")
  return result
}

export async function listFaqs() {
  return serverApi.content.faqs()
}

export async function upsertFaq(input: { id?: number; question: string; answer: string }) {
  const result = await serverApi.content.upsertFaq(input)
  revalidatePath("/admin/settings")
  revalidatePath("/")
  return result
}

export async function deleteFaq(id: number) {
  const result = await serverApi.content.deleteFaq(id)
  revalidatePath("/admin/settings")
  revalidatePath("/")
  return result
}

export async function moveFaq(id: number, direction: "up" | "down") {
  const result = await serverApi.content.moveFaq(id, direction)
  revalidatePath("/admin/settings")
  revalidatePath("/")
  return result
}

export async function listTestimonials() {
  return serverApi.content.testimonials()
}

export async function upsertTestimonial(input: {
  id?: number
  stars?: number
  tag?: string
  quote: string
  name: string
  role?: string
  avatar?: string
}) {
  const result = await serverApi.content.upsertTestimonial(input)
  revalidatePath("/admin/settings")
  revalidatePath("/")
  return result
}

export async function deleteTestimonial(id: number) {
  const result = await serverApi.content.deleteTestimonial(id)
  revalidatePath("/admin/settings")
  revalidatePath("/")
  return result
}

export async function moveTestimonial(id: number, direction: "up" | "down") {
  const result = await serverApi.content.moveTestimonial(id, direction)
  revalidatePath("/admin/settings")
  revalidatePath("/")
  return result
}
