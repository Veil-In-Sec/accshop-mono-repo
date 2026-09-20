import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../prisma/prisma.module"
import { signAdminToken, verifyAdminPassword } from "../auth/admin.guard"
import { FulfillmentService } from "../fulfillment/fulfillment.service"
import { Hotmail143Service } from "../hotmail143/hotmail143.service"
import { BulkMailService } from "../bulkmail/bulkmail.service"
import { FxService } from "../fx/fx.service"
import { SupportService } from "../support/support.service"

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fulfillment: FulfillmentService,
    private readonly hotmail143: Hotmail143Service,
    private readonly bulkmail: BulkMailService,
    private readonly fx: FxService,
    private readonly support: SupportService,
  ) {}

  /** Password login with a small delay on failure to slow brute-force attempts. */
  async login(password: string) {
    const ok = verifyAdminPassword(password)
    if (!ok) {
      await new Promise((resolve) => setTimeout(resolve, 600))
      throw new BadRequestException("Incorrect password.")
    }
    return { success: true, message: "Signed in.", token: signAdminToken() }
  }

  logout() {
    return { success: true, message: "Signed out." }
  }

  async getOverview() {
    const since = new Date()
    since.setDate(since.getDate() - 13)
    since.setHours(0, 0, 0, 0)
    // Year window for period sums (today/week/month/year) — bounded, unlike
    // the previous unbounded full-table load.
    const sinceYear = new Date()
    sinceYear.setDate(sinceYear.getDate() - 366)
    sinceYear.setHours(0, 0, 0, 0)

    // DB-side aggregates first; only the year window is loaded row-wise
    // for period sums + chart. Global totals come from raw SQL below.
    const [userCount, orderCount, pendingDeposits, walletAgg, windowOrders, siteSettings] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.order.count(),
        this.prisma.depositRequest.count({ where: { status: "pending" } }),
        this.prisma.wallet.aggregate({ _sum: { balance: true } }),
        this.prisma.order.findMany({
          where: { purchasedAt: { gte: sinceYear } },
          select: { purchasedAt: true, price: true, quantity: true, status: true, actualCost: true },
          take: 10000,
          orderBy: { purchasedAt: "desc" },
        }),
        this.prisma.siteSetting.findUnique({ where: { id: 1 } }),
      ])
    // Store currency: supplier USD amounts are converted to local (e.g. BDT)
    // so profit math (sales − cost) stays in one currency.
    const usdToLocalRate = siteSettings ? Number(siteSettings.usdToLocalRate) || 1 : 1
    const siteCurrency = siteSettings?.currencySymbol ?? "BDT"
    const recentOrders = windowOrders.filter(
      (o) => o.purchasedAt && new Date(o.purchasedAt) >= since,
    )
    // Totals via raw SQL (price × qty) so we never load the whole table.
    let totals: Array<{ sales: number; cost: number }> = [{ sales: 0, cost: 0 }]
    try {
      totals = await this.prisma.$queryRaw<Array<{ sales: number; cost: number }>>`
        SELECT
          COALESCE(SUM(price * quantity), 0)::float AS sales,
          COALESCE(SUM(COALESCE(actual_cost, 0)), 0)::float AS cost
        FROM orders WHERE status = 'completed'
      `
    } catch {
      // Fallback: estimate from the window if raw query fails.
    }
    const allOrdersForRevenue: Array<{ price: unknown; quantity: number | null; status: string | null; purchasedAt: Date; actualCost: unknown | null }> =
      windowOrders as unknown as typeof allOrdersForRevenue
    // Total sales = Σ(price×qty) over orders.
    // Profit = total sales − total Hotmail143 cost, calculated from total orders:
    // profit = Σ(price×qty − actualCost) per order.
    const salesFor = (o: any) => Number(o.price) * (o.quantity ?? 1)
    const profitFor = (o: any) => Number(o.price) * (o.quantity ?? 1) - Number(o.actualCost ?? 0)
    const completedForRevenue = allOrdersForRevenue.filter((o) => (o.status ?? "").toString().toLowerCase() === "completed")
    const revenueSource = completedForRevenue.length > 0 ? completedForRevenue : allOrdersForRevenue
    // Prefer exact DB totals when completed orders exist; fall back to window sums.
    const useDbTotals = completedForRevenue.length > 0 && totals[0]
    const totalCustomerAmount = useDbTotals
      ? Number(totals[0].sales ?? 0)
      : revenueSource.reduce((sum, o) => sum + salesFor(o), 0)
    const totalSales = totalCustomerAmount
    const totalHotmailCost = useDbTotals
      ? Number(totals[0].cost ?? 0)
      : revenueSource.reduce((sum, o) => sum + Number(o.actualCost ?? 0), 0)
    // Fetch present Hotmail143 balance and derive previous = present + totalHotmailCost (since previous - present = cost)
    let presentHotmailBalance: number | null = null
    let previousHotmailBalance: number | null = null
    try {
      const bal = await this.hotmail143.getBalance()
      presentHotmailBalance = Number(bal.balance ?? 0)
      previousHotmailBalance = presentHotmailBalance + totalHotmailCost
    } catch {
      // Hotmail143 not configured — fallback to sum(actualCost) delta
      presentHotmailBalance = null
      previousHotmailBalance = null
    }
    // BulkMail works in USD — convert to the store's local currency (e.g. BDT).
    // Live internet rate when enabled, otherwise the locked flat value.
    // Total cost above already aggregates both suppliers via actualCost
    // (BulkMail costs are stored converted — see FulfillmentService).
    let presentBulkmailBalance: number | null = null
    let presentBulkmailBalanceUsd: number | null = null
    let bulkmailRate: number | null = null
    let bulkmailRateSource = "manual"
    const bulkmailCurrency = siteCurrency
    try {
      const bbal = await this.bulkmail.getBalance()
      presentBulkmailBalanceUsd = Number(bbal.balance ?? 0)
      const fx = await this.fx.getUsdToLocalRate(
        siteCurrency,
        usdToLocalRate,
        siteSettings?.fxLiveEnabled ?? true,
      )
      bulkmailRate = fx.rate
      bulkmailRateSource = fx.source
      presentBulkmailBalance = Number((presentBulkmailBalanceUsd * fx.rate).toFixed(2))
    } catch {
      presentBulkmailBalance = null
      presentBulkmailBalanceUsd = null
    }
    const totalRevenue = totalCustomerAmount - totalHotmailCost
    const totalProfit = totalRevenue

    // Sales by period — day / week / month / year (realtime, based on purchasedAt, total order amount)
    // Profit by period — same windows, profit calculated from total orders (sales − actualCost)
    const now = new Date()
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 6); startOfWeek.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); startOfMonth.setHours(0, 0, 0, 0)
    const startOfYear = new Date(now.getFullYear(), 0, 1); startOfYear.setHours(0, 0, 0, 0)
    const inSince = (since: Date) => revenueSource.filter((o: any) => o.purchasedAt && new Date(o.purchasedAt) >= since)
    const salesSumFor = (since: Date) => inSince(since).reduce((s: number, o: any) => s + salesFor(o), 0)
    const sumFor = (since: Date) => inSince(since).reduce((s: number, o: any) => s + profitFor(o), 0)
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
      revenueByDay.push({
        date: day.toISOString().slice(0, 10),
        revenue: 0,
        sales: 0,
        profit: 0,
        orders: 0,
      })
    }
    const dayIndex = new Map(revenueByDay.map((d) => [d.date, d]))
    // Only count completed (or all if none completed). revenue = total sales for the day,
    // profit calculated from total orders for the day (sales − actualCost).
    const recentSource = recentOrders.filter((o: any) => {
      const s = (o.status ?? "").toString().toLowerCase()
      if (completedForRevenue.length > 0) return s === "completed"
      return true
    })
    for (const order of recentSource) {
      const bucket = dayIndex.get(order.purchasedAt.toISOString().slice(0, 10))
      if (bucket) {
        const sale = Number(order.price) * (order.quantity ?? 1)
        const profit = sale - Number((order as any).actualCost ?? 0)
        bucket.sales = Number((bucket.sales + sale).toFixed(2))
        bucket.profit = Number((bucket.profit + profit).toFixed(2))
        bucket.revenue = bucket.sales
        bucket.orders += 1
      }
    }

    return {
      userCount,
      orderCount,
      totalCustomerAmount: Number(totalCustomerAmount.toFixed(2)),
      totalSales: Number(totalSales.toFixed(2)),
      totalHotmailCost: Number(totalHotmailCost.toFixed(2)),
      presentHotmailBalance,
      previousHotmailBalance,
      presentBulkmailBalance,
      presentBulkmailBalanceUsd,
      bulkmailRate,
      bulkmailRateSource,
      bulkmailCurrency,
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

  // --- Products ----------------------------------------------------------------

  async listProducts(section?: string) {
    const rows = await this.prisma.product.findMany({
      where: section ? { section } : undefined,
      orderBy: section ? [{ sortOrder: "asc" }] : [{ section: "asc" }, { sortOrder: "asc" }],
    })
    return rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      section: p.section,
      price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      stock: p.stock,
      tag: p.tag ?? "",
      badge: p.badge ?? "",
      active: p.active,
      featured: p.featured,
      externalProductType: p.externalProductType ?? "",
      externalAccountType: p.externalAccountType ?? "",
      supplier: (p as { supplier?: string }).supplier ?? "hotmail143",
      bulkmailProductId: (p as { bulkmailProductId?: number | null }).bulkmailProductId ?? null,
    }))
  }

  async upsertProduct(input: {
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
    const externalProductType = input.externalProductType?.trim() || null
    const externalAccountType = input.externalAccountType?.trim() || null
    const allowedSuppliers = ["hotmail143", "bulkmail", "custom"]
    const supplier = (input.supplier ?? "hotmail143").toLowerCase()
    if (!allowedSuppliers.includes(supplier)) {
      throw new BadRequestException("Invalid supplier. Use hotmail143, bulkmail, or custom.")
    }
    const bulkmailProductId =
      input.bulkmailProductId != null && Number.isInteger(Number(input.bulkmailProductId))
        ? Number(input.bulkmailProductId)
        : null
    if (supplier === "bulkmail" && bulkmailProductId == null) {
      throw new BadRequestException("BulkMail products require a BulkMail product id.")
    }
    // Backward compat: legacy custom products carry supplier=hotmail143 with
    // empty mapping — coerce them to custom instead of rejecting the update.
    let effectiveSupplier = supplier
    if (supplier === "hotmail143" && (!externalProductType || !externalAccountType)) {
      effectiveSupplier = "custom"
    }

    try {
      if (input.id) {
        await this.prisma.product.update({
          where: { id: input.id },
          data: {
            name: input.name,
            category: input.category,
            section: input.section,
            price: input.price.toFixed(2),
            originalPrice: input.originalPrice ? input.originalPrice.toFixed(2) : null,
            stock: input.stock,
            tag: input.tag || null,
            badge: input.badge || null,
            active: input.active,
            featured: input.featured,
            externalProductType,
            externalAccountType,
            supplier: effectiveSupplier,
            bulkmailProductId,
            updatedAt: new Date(),
          },
        })
      } else {
        await this.prisma.product.create({
          data: {
            slug: input.slug,
            name: input.name,
            category: input.category,
            section: input.section,
            price: input.price.toFixed(2),
            originalPrice: input.originalPrice ? input.originalPrice.toFixed(2) : null,
            stock: input.stock,
            tag: input.tag || null,
            badge: input.badge || null,
            active: input.active,
            featured: input.featured,
            externalProductType,
            externalAccountType,
            supplier: effectiveSupplier,
            bulkmailProductId,
          },
        })
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") throw new BadRequestException("A product with this slug already exists.")
        if (error.code === "P2025") throw new NotFoundException("Product not found.")
      }
      throw error
    }

    return { success: true }
  }

  async deleteProduct(id: number) {
    try {
      await this.prisma.product.delete({ where: { id } })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("Product not found.")
      }
      throw error
    }
    return { success: true }
  }

  // --- Users / orders / transactions ---------------------------------------------

  async listUsers() {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: "desc" } })
    const walletRows = await this.prisma.wallet.findMany()
    const balanceByUserId = new Map(walletRows.map((w) => [w.userId, Number(w.balance)]))

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      balance: balanceByUserId.get(u.id) ?? 0,
      createdAt: u.createdAt.toISOString(),
    }))
  }

  /**
   * Full per-user account dashboard for the admin panel — profile, wallet,
   * lifetime stats, recent orders / transactions / deposits, support summary
   * and session info in a single call.
   */
  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException("User not found.")

    const [wallet, orders, transactions, deposits, supportRows, sessions, unreadNotifications, totpCount] =
      await Promise.all([
        this.prisma.wallet.findUnique({ where: { userId } }),
        this.prisma.order.findMany({
          where: { userId },
          orderBy: { purchasedAt: "desc" },
          take: 200,
        }),
        this.prisma.transaction.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
        this.prisma.depositRequest.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
        this.prisma.supportMessage.findMany({
          where: { userId },
          orderBy: { id: "desc" },
          take: 20,
        }),
        this.prisma.session.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
        }),
        this.prisma.notification.count({ where: { userId, read: false } }),
        this.prisma.totpKey.count({ where: { userId } }),
      ])

    const completedOrders = orders.filter(
      (o) => (o.status ?? "").toString().toLowerCase() === "completed",
    )
    const totalSpent = completedOrders.reduce(
      (sum, o) => sum + Number(o.price) * (o.quantity ?? 1),
      0,
    )
    const totalDeposited = transactions
      .filter((t) => t.type === "deposit" && t.status === "completed")
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const pendingDeposits = deposits.filter((d) => d.status === "pending").length
    const unreadSupport = await this.prisma.supportMessage.count({
      where: { userId, sender: "customer", read: false },
    })
    const lastSupport = supportRows[0] ?? null

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      wallet: {
        balance: Number(wallet?.balance ?? 0),
        referralCode: wallet?.referralCode ?? null,
        referredBy: wallet?.referredBy ?? null,
        updatedAt: wallet?.updatedAt?.toISOString() ?? null,
      },
      stats: {
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        totalSpent: Number(totalSpent.toFixed(2)),
        totalDeposited: Number(totalDeposited.toFixed(2)),
        totalTransactions: transactions.length,
        pendingDeposits,
        unreadSupport,
        unreadNotifications,
        activeSessions: sessions.filter((s) => new Date(s.expiresAt) > new Date()).length,
        totpKeys: totpCount,
      },
      orders: orders.map((o) => ({
        id: o.id,
        productName: o.productName,
        price: Number(o.price),
        quantity: o.quantity,
        total: Number((Number(o.price) * (o.quantity ?? 1)).toFixed(2)),
        status: o.status,
        supplier: (o as { supplier?: string }).supplier ?? "hotmail143",
        externalOrderId: o.externalOrderId ?? "",
        purchasedAt: o.purchasedAt.toISOString(),
      })),
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        description: t.description ?? "",
        amount: Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
      deposits: deposits.map((d) => ({
        id: d.id,
        amount: Number(d.amount),
        currency: d.currency,
        paymentMethodId: d.paymentMethodId ?? null,
        senderAccountNumber: d.senderAccountNumber ?? "",
        transactionReference: d.transactionReference,
        status: d.status,
        adminNote: d.adminNote ?? "",
        createdAt: d.createdAt.toISOString(),
        reviewedAt: d.reviewedAt?.toISOString() ?? null,
      })),
      support: {
        total: await this.prisma.supportMessage.count({ where: { userId } }),
        unread: unreadSupport,
        lastText: lastSupport?.text ?? "",
        lastSender: lastSupport?.sender ?? "",
        lastAt: lastSupport?.createdAt.toISOString() ?? null,
        recent: [...supportRows].reverse().map((m) => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
          read: m.read,
          createdAt: m.createdAt.toISOString(),
        })),
      },
      sessions: sessions.map((s) => ({
        id: s.id,
        ipAddress: s.ipAddress ?? "",
        userAgent: s.userAgent ?? "",
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        active: new Date(s.expiresAt) > new Date(),
      })),
    }
  }

  async adjustUserBalance(userId: string, amount: number, note?: string) {    if (!Number.isFinite(amount) || amount === 0) {
      throw new BadRequestException("Enter a non-zero adjustment amount.")
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new BadRequestException("User not found.")

    const result = await this.prisma.$transaction(async (tx) => {
      // Ensure wallet exists, then apply an atomic increment so concurrent
      // adjustments / approvals cannot lose updates.
      await tx.wallet.upsert({
        where: { userId },
        create: { userId, balance: "0.00" },
        update: {},
      })

      const current = await tx.wallet.findUniqueOrThrow({ where: { userId } })
      const nextBalance = Number((Number(current.balance) + amount).toFixed(2))
      if (nextBalance < 0) {
        throw new BadRequestException("Adjustment would make the balance negative.")
      }

      const updated = await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: amount }, updatedAt: new Date() },
      })

      await tx.transaction.create({
        data: {
          userId,
          type: "adjustment",
          description: note?.trim() || "Manual balance adjustment by admin",
          amount: amount.toFixed(2),
          balanceAfter: Number(updated.balance).toFixed(2),
          status: "completed",
        },
      })

      return Number(updated.balance)
    })

    return { success: true, message: `Balance updated to $${result.toFixed(2)}.` }
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new BadRequestException("User not found.")

    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.deleteMany({ where: { userId } })
      await tx.transaction.deleteMany({ where: { userId } })
      await tx.order.deleteMany({ where: { userId } })
      await tx.depositRequest.deleteMany({ where: { userId } })
      await tx.supportMessage.deleteMany({ where: { userId } })
      await tx.notification.deleteMany({ where: { userId } })
      await tx.session.deleteMany({ where: { userId } })
      await tx.account.deleteMany({ where: { userId } })
      await tx.user.delete({ where: { id: userId } })
    })

    return { success: true, message: "User deleted." }
  }

  // --- Live support chat (admin side) ------------------------------------------

  listSupportConversations() {
    return this.support.listConversations()
  }

  getSupportThread(userId: string) {
    return this.support.getThread(userId)
  }

  replySupportMessage(userId: string, text: string) {
    return this.support.replyAsAdmin(userId, text)
  }

  getSupportUnreadCount() {
    return this.support.totalUnread()
  }

  async listAllOrders(take = 200, skip = 0) {
    const rows = await this.prisma.order.findMany({
      orderBy: { purchasedAt: "desc" },
      take: Math.min(500, Math.max(1, take)),
      skip: Math.max(0, skip),
    })

    const userIds = [...new Set(rows.map((r) => r.userId))]
    const users =
      userIds.length > 0 ? await this.prisma.user.findMany({ where: { id: { in: userIds } } }) : []
    const emailByUserId = new Map(users.map((u) => [u.id, u.email]))

    return rows.map((o) => ({
      id: o.id,
      userEmail: emailByUserId.get(o.userId) ?? o.userId,
      productName: o.productName,
      price: Number(o.price),
      quantity: o.quantity,
      status: o.status,
      supplier: (o as { supplier?: string }).supplier ?? "hotmail143",
      externalOrderId: o.externalOrderId ?? "",
      purchasedAt: o.purchasedAt.toISOString(),
      deliveredEmail: o.deliveredEmail ?? "",
      deliveredPassword: o.deliveredPassword ?? "",
      deliveredRefreshToken: o.deliveredRefreshToken ?? "",
      deliveredClientId: o.deliveredClientId ?? "",
      deliveredCredentials: o.deliveredCredentials ?? "",
    }))
  }

  // --- Hotmail143 integration --------------------------------------------------

  getHotmailBalance() {
    return this.hotmail143.getBalance()
  }

  getHotmailStock() {
    return this.hotmail143.getStock()
  }

  getHotmailProducts() {
    return this.hotmail143.listProducts()
  }

  async updateHotmailConfig(input: { apiKey?: string; baseUrl?: string }) {
    const data: { hotmailApiKey?: string | null; hotmailApiBaseUrl?: string | null } = {}
    if (input.apiKey !== undefined) data.hotmailApiKey = input.apiKey || null
    if (input.baseUrl !== undefined) data.hotmailApiBaseUrl = input.baseUrl || null

    await this.prisma.siteSetting.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    })
    return { success: true }
  }

  // --- BulkMail integration (mirrors Hotmail143) ------------------------------

  getBulkmailBalance() {
    return this.getBulkmailBalanceLocal()
  }

  /** BulkMail wallet works in USD — return local (BDT) + raw USD + rate info. */
  async getBulkmailBalanceLocal() {
    const [bal, settings] = await Promise.all([
      this.bulkmail.getBalance(),
      this.prisma.siteSetting.findUnique({ where: { id: 1 } }),
    ])
    const currency = settings?.currencySymbol ?? "BDT"
    const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1
    const fx = await this.fx.getUsdToLocalRate(currency, manual, settings?.fxLiveEnabled ?? true)
    const balanceUsd = Number(bal.balance ?? 0)
    return {
      balance: Number((balanceUsd * fx.rate).toFixed(2)),
      balanceUsd,
      currency,
      email: bal.email ?? "",
      rate: fx.rate,
      rateSource: fx.source,
      fetchedAt: fx.fetchedAt,
    }
  }

  /** Effective USD → local rate (live internet rate, flat value, or manual fallback). */
  async getFxRate() {
    const settings = await this.prisma.siteSetting.findUnique({ where: { id: 1 } })
    const currency = settings?.currencySymbol ?? "BDT"
    const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1
    const liveEnabled = settings?.fxLiveEnabled ?? true
    const fx = await this.fx.getUsdToLocalRate(currency, manual, liveEnabled)
    return {
      rate: fx.rate,
      source: fx.source,
      liveEnabled,
      currency,
      fetchedAt: fx.fetchedAt,
      manualRate: manual,
    }
  }

  // --- BulkMail supplier orders (purchase facility) ----------------------------

  private async withFx() {
    const settings = await this.prisma.siteSetting.findUnique({ where: { id: 1 } })
    const currency = settings?.currencySymbol ?? "BDT"
    const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1
    const fx = await this.fx.getUsdToLocalRate(currency, manual, settings?.fxLiveEnabled ?? true)
    return { currency, fx }
  }

  /** Supplier-side order list with BDT-converted totals. */
  async listBulkmailOrders(query: { page?: number; perPage?: number; status?: string }) {
    const [list, { currency, fx }] = await Promise.all([
      this.bulkmail.listOrders(query),
      this.withFx(),
    ])
    const toBdt = (usd: number) => Number((usd * fx.rate).toFixed(2))
    return {
      items: list.items.map((o) => ({
        ...o,
        totalAmountBdt: toBdt(o.totalAmount),
        unitPriceBdt: toBdt(o.unitPrice),
      })),
      meta: list.meta,
      currency,
      rate: fx.rate,
      rateSource: fx.source,
    }
  }

  /** Single supplier order with BDT-converted totals. */
  async getBulkmailOrder(id: number) {
    const [order, { currency, fx }] = await Promise.all([
      this.bulkmail.getOrder(id),
      this.withFx(),
    ])
    const toBdt = (usd: number) => Number((usd * fx.rate).toFixed(2))
    return {
      ...order,
      totalAmountBdt: toBdt(order.totalAmount),
      unitPriceBdt: toBdt(order.unitPrice),
      currency,
      rate: fx.rate,
      rateSource: fx.source,
    }
  }

  /**
   * Cancels a pending supplier order. The refund lands in the BulkMail
   * wallet — the local customer order is deliberately untouched.
   */
  async cancelBulkmailOrder(id: number) {
    const [result, { currency, fx }] = await Promise.all([
      this.bulkmail.cancelOrder(id),
      this.withFx(),
    ])
    return {
      success: true,
      message: result.message,
      refundedAmount: result.refundedAmount,
      refundedAmountBdt: Number((result.refundedAmount * fx.rate).toFixed(2)),
      currency,
    }
  }

  /** Re-exports supplier stock for download (txt/csv/json passthrough). */
  async exportBulkmailOrder(id: number, format: "txt" | "csv" | "json") {
    const { contentType, content } = await this.bulkmail.exportOrder(id, format)
    const ext = format === "csv" ? "csv" : format === "json" ? "json" : "txt"
    return {
      content,
      contentType,
      filename: `bulkmail-order-${id}.${ext}`,
    }
  }

  /** Switches the USD → local rate between live internet rate and the flat value. */
  async updateFxMode(live: boolean) {
    await this.prisma.siteSetting.upsert({
      where: { id: 1 },
      create: { id: 1, fxLiveEnabled: live },
      update: { fxLiveEnabled: live },
    })
    return { success: true, message: live ? "Live internet rate enabled." : "Flat rate enabled." }
  }

  getBulkmailStock() {
    return this.bulkmail.getStock()
  }

  getBulkmailProducts() {
    return this.bulkmail.listProducts()
  }

  async updateBulkmailConfig(input: { apiKey?: string; baseUrl?: string }) {
    const data: { bulkmailApiKey?: string | null; bulkmailApiBaseUrl?: string | null } = {}
    if (input.apiKey !== undefined) data.bulkmailApiKey = input.apiKey || null
    if (input.baseUrl !== undefined) data.bulkmailApiBaseUrl = input.baseUrl || null

    await this.prisma.siteSetting.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    })
    return { success: true }
  }

  /**
   * BulkMail catalog for the admin mapping browser. NOTE: the supplier ignores
   * the documented search/sort params, so we filter/sort/paginate locally over
   * the full cached catalog — search actually works here.
   */
  async getBulkmailCatalog(query: {
    page?: number
    perPage?: number
    search?: string
    inStock?: boolean
    sort?: string
    order?: string
  }) {
    const [all, settings] = await Promise.all([
      this.bulkmail.listAllCatalogProducts(),
      this.prisma.siteSetting.findUnique({ where: { id: 1 } }),
    ])
    const currency = settings?.currencySymbol ?? "BDT"
    const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1
    const fx = await this.fx.getUsdToLocalRate(currency, manual, settings?.fxLiveEnabled ?? true)
    const toBdt = (usd: number) => Number((usd * fx.rate).toFixed(2))

    let items = all
    if (query.inStock) {
      items = items.filter((c) => c.inStock && c.stock > 0)
    }
    const q = query.search?.trim().toLowerCase()
    if (q) {
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.sku.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          String(c.productId) === q,
      )
    }
    const dir = query.order === "desc" ? -1 : 1
    const sorted = [...items].sort((a, b) => {
      switch (query.sort) {
        case "price":
          return (a.price - b.price) * dir
        case "stock_quantity":
          return (a.stock - b.stock) * dir
        case "created_at":
          return (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0) * dir
        default:
          return a.name.localeCompare(b.name) * dir
      }
    })

    const perPage = Math.min(100, Math.max(1, query.perPage ?? 10))
    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
    const currentPage = Math.min(Math.max(1, query.page ?? 1), totalPages)
    const slice = sorted.slice((currentPage - 1) * perPage, currentPage * perPage)

    return {
      items: slice.map((c) => ({
        ...c,
        priceBdt: toBdt(c.price),
        basePriceBdt: toBdt(c.basePrice),
        bulkTiersBdt: c.bulkTiers.map((t) => ({
          min_quantity: t.min_quantity,
          price: t.price,
          priceBdt: toBdt(t.price),
        })),
      })),
      meta: {
        current_page: currentPage,
        per_page: perPage,
        total: sorted.length,
        total_pages: totalPages,
      },
      currency,
      rate: fx.rate,
      rateSource: fx.source,
    }
  }

  /**
   * Catalog details + supplier totals at several quantities (bulk tiers
   * applied upstream), all converted to BDT — guides manual sell pricing.
   */
  async getBulkmailCatalogProduct(id: number) {
    const [preview, settings] = await Promise.all([
      this.bulkmail.getPricePreview(id),
      this.prisma.siteSetting.findUnique({ where: { id: 1 } }),
    ])
    const currency = settings?.currencySymbol ?? "BDT"
    const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1
    const fx = await this.fx.getUsdToLocalRate(currency, manual)
    const toBdt = (usd: number) => Number((usd * fx.rate).toFixed(2))
    return {
      product: {
        ...preview.product,
        priceBdt: toBdt(preview.product.price),
        basePriceBdt: toBdt(preview.product.basePrice),
      },
      tiers: preview.product.bulkTiers.map((t) => ({
        min_quantity: t.min_quantity,
        price: t.price,
        priceBdt: toBdt(t.price),
      })),
      previews: preview.previews.map((p) => ({
        quantity: p.quantity,
        unitPrice: p.unit_price,
        totalPrice: p.total_price,
        unitPriceBdt: toBdt(p.unit_price),
        totalPriceBdt: toBdt(p.total_price),
        discountApplied: p.discount_applied,
        savings: p.savings,
        savingsBdt: toBdt(p.savings),
      })),
      currency,
      rate: fx.rate,
      rateSource: fx.source,
    }
  }

  /**
   * Retry endpoint for a stuck order. Instant checkout already fulfills via
   * the shared FulfillmentService — this delegates to the same logic.
   */
  async fulfillOrder(orderId: number) {
    const fulfilled = await this.fulfillment.fulfill(orderId)

    return {
      success: true,
      message: `Order fulfilled — ${fulfilled.accounts.length} account(s) delivered.`,
      remainingBalance: fulfilled.remainingBalance,
      accounts: fulfilled.accounts,
    }
  }

  /** Orders awaiting delivery (pending + processing) — drives the admin nav badge. */
  async getAttentionCount() {
    const count = await this.prisma.order.count({
      where: { status: { in: ["pending", "processing"] } },
    })
    return { count }
  }

  async listAllTransactions(type?: string) {
    const rows = await this.prisma.transaction.findMany({
      where: type ? { type } : undefined,
      orderBy: { createdAt: "desc" },
      take: 500,
    })

    const userIds = [...new Set(rows.map((r) => r.userId))]
    const users =
      userIds.length > 0 ? await this.prisma.user.findMany({ where: { id: { in: userIds } } }) : []
    const emailByUserId = new Map(users.map((u) => [u.id, u.email]))

    return rows.map((t) => ({
      id: t.id,
      userEmail: emailByUserId.get(t.userId) ?? t.userId,
      type: t.type,
      description: t.description ?? "",
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }))
  }

  async getRecentActivity(limit = 8) {
    const [transactions, deposits] = await Promise.all([
      this.prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, userId: true, type: true, amount: true, createdAt: true },
      }),
      this.prisma.depositRequest.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, userId: true, amount: true, createdAt: true },
      }),
    ])

    const userIds = [
      ...new Set([...transactions.map((t) => t.userId), ...deposits.map((d) => d.userId)]),
    ]
    const users =
      userIds.length > 0 ? await this.prisma.user.findMany({ where: { id: { in: userIds } } }) : []
    const emailByUserId = new Map(users.map((u) => [u.id, u.email]))

    const events = [
      ...transactions.map((t) => ({
        kind: t.type,
        userEmail: emailByUserId.get(t.userId) ?? t.userId,
        amount: Number(t.amount),
        pending: false,
        createdAt: t.createdAt.toISOString(),
      })),
      ...deposits.map((d) => ({
        kind: "deposit_request",
        userEmail: emailByUserId.get(d.userId) ?? d.userId,
        amount: Number(d.amount),
        pending: true,
        createdAt: d.createdAt.toISOString(),
      })),
    ]

    events.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return events.slice(0, limit)
  }

  // --- Categories -------------------------------------------------------------

  private slugifyCategory(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60)
  }

  private async uniqueCategorySlug(name: string, excludeId?: number): Promise<string> {
    const base = this.slugifyCategory(name) || "cat"
    let candidate = base
    let n = 1
    for (;;) {
      const found = await this.prisma.category.findFirst({
        where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      })
      if (!found) return candidate
      candidate = `${base}-${n++}`
    }
  }

  /** All categories (existing + custom), each with its id, name, active flag. */
  async listCategories() {
    const rows = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    })
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      active: c.active,
      isCustom: c.isCustom,
    }))
  }

  async createCategory(name: string) {
    const trimmed = name.trim()
    if (!trimmed) throw new BadRequestException("Category name is required.")
    const clash = await this.prisma.category.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" } },
    })
    if (clash) throw new BadRequestException("A category with this name already exists.")

    const max = await this.prisma.category.aggregate({ _max: { sortOrder: true } })
    const nextOrder = (max._max.sortOrder ?? 0) + 1
    try {
      const slug = await this.uniqueCategorySlug(trimmed)
      const created = await this.prisma.category.create({
        data: { name: trimmed, slug, isCustom: true, active: true, sortOrder: nextOrder },
      })
      return {
        success: true,
        category: { id: created.id, name: created.name, active: created.active, isCustom: created.isCustom },
      }
    } catch (error) {
      // Concurrent same-name creates: retry once with a fresh suffixed slug.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const slug = await this.uniqueCategorySlug(`${trimmed}-${Date.now() % 10000}`)
        const created = await this.prisma.category.create({
          data: { name: trimmed, slug, isCustom: true, active: true, sortOrder: nextOrder },
        })
        return {
          success: true,
          category: { id: created.id, name: created.name, active: created.active, isCustom: created.isCustom },
        }
      }
      throw error
    }
  }

  async updateCategory(
    id: number,
    input: { name?: string; active?: boolean },
  ) {
    const cat = await this.prisma.category.findUnique({ where: { id } })
    if (!cat) throw new BadRequestException("Category not found.")

    // Rename + product regroup must be atomic — partial failure otherwise
    // leaves products pointing at the old category name.
    return this.prisma.$transaction(async (tx) => {
      const data: { name?: string; slug?: string; active?: boolean } = {}
      if (input.name !== undefined) {
        const trimmed = input.name.trim()
        if (!trimmed) throw new BadRequestException("Category name is required.")
        if (trimmed.toLowerCase() !== cat.name.toLowerCase()) {
          const clash = await tx.category.findFirst({
            where: { name: { equals: trimmed, mode: "insensitive" }, NOT: { id } },
          })
          if (clash) throw new BadRequestException("A category with this name already exists.")
          await tx.product.updateMany({
            where: { category: cat.name },
            data: { category: trimmed },
          })
          data.name = trimmed
          data.slug = await this.uniqueCategorySlug(trimmed, id)
        }
      }
      if (input.active !== undefined) data.active = input.active

      if (Object.keys(data).length === 0) return { success: true }
      const updated = await tx.category.update({ where: { id }, data })
      return {
        success: true,
        category: { id: updated.id, name: updated.name, active: updated.active, isCustom: updated.isCustom },
      }
    })
  }

  async deleteCategory(id: number) {
    const cat = await this.prisma.category.findUnique({ where: { id } })
    if (!cat) throw new BadRequestException("Category not found.")
    const used = await this.prisma.product.count({ where: { category: cat.name } })
    if (used > 0) {
      throw new BadRequestException(
        `Cannot delete "${cat.name}" because ${used} product(s) still use it. Reassign or remove those products first.`,
      )
    }
    await this.prisma.category.delete({ where: { id } })
    return { success: true }
  }
}
