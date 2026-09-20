import { BadRequestException, Injectable } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.module"
import {
  fetchWithTimeout as upstreamFetch,
  parseUpstreamError as upstreamError,
  safeJson as upstreamJson,
} from "../common/upstream-http"

const DEFAULT_BASE_URL = "https://bulkmail.shop/api/v2"

export interface BulkMailBalance {
  balance: number
  email: string
  currency: string
}

export interface BulkMailAccount {
  email: string
  password: string
  refresh_token?: string
  client_id?: string
}

export interface BulkMailPurchaseResult {
  orderId: number
  orderNumber: string
  accounts: BulkMailAccount[]
  totalCost: number
  remainingBalance: number
}

export interface BulkMailProductOption {
  productId: number
  name: string
  sku: string
  stock: number
  price: number
  description?: string
  inStock?: boolean
  bulkPricingEnabled?: boolean
  bulkTiers?: BulkMailTier[]
}

export interface BulkMailTier {
  min_quantity: number
  price: number
}

export interface BulkMailCatalogProduct {
  productId: number
  name: string
  sku: string
  description: string
  /** Personalized USD unit price for this API key. */
  price: number
  basePrice: number
  stock: number
  inStock: boolean
  bulkPricingEnabled: boolean
  bulkTiers: BulkMailTier[]
  imageUrl: string | null
  createdAt: string
}

export interface BulkMailCatalogPage {
  items: BulkMailCatalogProduct[]
  meta: {
    current_page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export interface BulkMailPricePreview {
  product: BulkMailCatalogProduct
  previews: BulkMailPriceCalculation[]
}

export interface BulkMailOrderItem {
  id: number
  orderNumber: string
  productName: string
  quantity: number
  unitPrice: number
  totalAmount: number
  status: string
  createdAt: string
  stockItems: string[]
}

export interface BulkMailOrderList {
  items: BulkMailOrderItem[]
  meta: {
    current_page: number
    per_page: number
    total: number
    total_pages: number
  }
}

/**
 * Purchase error that still carries the supplier order id (when the supplier
 * created/charged the order but delivery failed). Fulfillment stamps it on
 * the local order so admin can correlate, re-export, or retry.
 */
export class BulkMailOrderError extends BadRequestException {
  readonly supplierOrderId?: number

  constructor(message: string, supplierOrderId?: number) {
    super(message)
    this.supplierOrderId = supplierOrderId
  }
}

export interface BulkMailStock {
  product_id: number
  product_name: string
  sku: string
  stock_count: number
  in_stock: boolean
  price: number
}

export interface BulkMailPriceCalculation {
  quantity: number
  unit_price: number
  total_price: number
  discount_applied: boolean
  savings: number
}

interface BulkMailEnvelope<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
  errors?: Record<string, string[]>
}

@Injectable()
export class BulkMailService {
  constructor(private readonly prisma: PrismaService) {}

  /** Short-lived cache for the merged catalog (mapping dropdown). */
  private catalogCache: { at: number; items: BulkMailProductOption[] } | null = null
  private allCatalogCache: { at: number; items: BulkMailCatalogProduct[] } | null = null
  private static readonly CATALOG_CACHE_TTL_MS = 5 * 60 * 1000

  private async getConfig(): Promise<{ apiKey: string | null; baseUrl: string }> {
    const settings = await this.prisma.siteSetting.findUnique({ where: { id: 1 } })
    return {
      apiKey: settings?.bulkmailApiKey ?? null,
      baseUrl: (settings?.bulkmailApiBaseUrl || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    }
  }

  private async parseUpstreamError(res: Response, fallback: string): Promise<never> {
    return upstreamError(res, fallback)
  }

  private async fetchWithTimeout(url: string, init?: RequestInit, ms = 20000): Promise<Response> {
    return upstreamFetch(url, init, ms, "BulkMail")
  }

  private async safeJson(res: Response): Promise<any> {
    return upstreamJson(res, "BulkMail")
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const { apiKey, baseUrl } = await this.getConfig()
    if (!apiKey) throw new BadRequestException("BulkMail API key is not configured.")

    const url = `${baseUrl}${path}`
    const res = await this.fetchWithTimeout(url, {
      ...init,
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    })
    if (!res.ok) {
      await this.parseUpstreamError(res, "BulkMail API request failed")
    }
    const raw = (await this.safeJson(res)) as BulkMailEnvelope<T>
    if (raw && typeof raw === "object" && "success" in raw && raw.success === false) {
      const detail = raw.error ?? raw.message ?? "BulkMail request failed."
      throw new BadRequestException(detail)
    }
    // Endpoints return { success, data, ... } — unwrap data when present.
    if (raw && typeof raw === "object" && "data" in raw && "success" in raw) {
      return raw.data as T
    }
    return raw as T
  }

  /** Fetches the current BulkMail wallet balance. Mirrors Hotmail143 getBalance(). */
  async getBalance(): Promise<BulkMailBalance> {
    const data = await this.request<{ balance: number; currency: string }>("/wallet/balance")
    // Best-effort email for admin display parity with Hotmail143 (balance + email).
    let email = ""
    try {
      const profile = await this.request<{ email?: string }>("/user/profile")
      email = profile?.email ?? ""
    } catch {
      /* balance is authoritative — profile is optional */
    }
    return {
      balance: Number(data.balance ?? 0),
      email,
      currency: data.currency ?? "USD",
    }
  }

  /** Fetches realtime stock for all products. Mirrors Hotmail143 getStock(). */
  async getStock() {
    const { apiKey, baseUrl } = await this.getConfig()
    if (!apiKey) throw new BadRequestException("BulkMail API key is not configured.")
    // /stock is public but we still send the key when configured (rate-limit tier).
    const res = await this.fetchWithTimeout(`${baseUrl}/stock`, {
      headers: {
        Accept: "application/json",
        ...(apiKey ? { "X-API-Key": apiKey } : {}),
      },
    })
    if (!res.ok) {
      await this.parseUpstreamError(res, "BulkMail stock request failed")
    }
    return this.safeJson(res)
  }

  /** Returns a flattened `"<productId>"` → count map. Mirrors Hotmail143 getStockMap(). */
  async getStockMap(): Promise<Map<string, number>> {
    const result = await this.getStock()
    const list: BulkMailStock[] =
      (result as { data?: BulkMailStock[] }).data ??
      (Array.isArray(result) ? (result as BulkMailStock[]) : [])
    const map = new Map<string, number>()
    for (const item of list) {
      if (item && typeof item.product_id === "number") {
        map.set(String(item.product_id), Number(item.stock_count ?? 0))
      }
    }
    return map
  }

  /**
   * Returns the list of selectable products from the full BulkMail catalog
   * (all pages) merged with realtime /stock counts.
   * Mirrors Hotmail143 listProducts() — each entry carries the supplier
   * product id, a human-readable name, sku, personalized USD price and live
   * stock. Result is cached 5 minutes for the admin mapping dropdown.
   */
  async listProducts(): Promise<BulkMailProductOption[]> {
    const now = Date.now()
    if (
      this.catalogCache &&
      now - this.catalogCache.at < BulkMailService.CATALOG_CACHE_TTL_MS
    ) {
      return this.catalogCache.items
    }
    const [catalog, stockMap] = await Promise.all([
      this.listAllCatalogProducts(),
      this.getStockMap().catch(() => new Map<string, number>()),
    ])
    const items: BulkMailProductOption[] = catalog.map((c) => ({
      productId: c.productId,
      name: c.name,
      sku: c.sku,
      stock: stockMap.get(String(c.productId)) ?? c.stock,
      price: c.price,
      description: c.description,
      inStock: c.inStock,
      bulkPricingEnabled: c.bulkPricingEnabled,
      bulkTiers: c.bulkTiers,
    }))
    this.catalogCache = { at: now, items }
    return items
  }

  private toCatalogProduct(raw: any): BulkMailCatalogProduct {
    const tiers: BulkMailTier[] = Array.isArray(raw?.bulk_tiers)
      ? raw.bulk_tiers
          .filter((t: any) => Number.isFinite(Number(t?.min_quantity)))
          .map((t: any) => ({
            min_quantity: Number(t.min_quantity),
            price: Number(t.price ?? 0),
          }))
      : []
    return {
      productId: Number(raw?.id ?? raw?.product_id ?? 0),
      name: String(raw?.product_name ?? raw?.name ?? `Product`),
      sku: String(raw?.sku ?? ""),
      description: String(raw?.description ?? ""),
      price: Number(raw?.price ?? 0),
      basePrice: Number(raw?.base_price ?? raw?.price ?? 0),
      stock: Number(raw?.stock_quantity ?? raw?.stock_count ?? 0),
      inStock: Boolean(raw?.in_stock ?? Number(raw?.stock_quantity ?? 0) > 0),
      bulkPricingEnabled: Boolean(raw?.bulk_pricing_enabled),
      bulkTiers: tiers,
      imageUrl: raw?.image_url ?? null,
      createdAt: String(raw?.created_at ?? ""),
    }
  }

  /**
   * One catalog page straight from GET /products with the documented filters.
   * Public endpoint — API key is attached when configured (higher rate tier).
   */
  async listCatalogPage(params?: {
    page?: number
    perPage?: number
    search?: string
    inStock?: boolean
    sort?: string
    order?: string
  }): Promise<BulkMailCatalogPage> {
    const { baseUrl } = await this.getConfig()
    const qs = new URLSearchParams()
    qs.set("page", String(params?.page && params.page > 0 ? params.page : 1))
    qs.set("per_page", String(Math.min(100, Math.max(1, params?.perPage ?? 20))))
    if (params?.search?.trim()) qs.set("search", params.search.trim())
    if (params?.inStock !== undefined) qs.set("in_stock", params.inStock ? "true" : "false")
    const allowedSort = ["name", "price", "stock_quantity", "created_at"]
    if (params?.sort && allowedSort.includes(params.sort)) qs.set("sort", params.sort)
    if (params?.order === "asc" || params?.order === "desc") qs.set("order", params.order)

    const res = await this.fetchWithTimeout(`${baseUrl}/products?${qs.toString()}`, {
      headers: await this.publicHeaders(),
    })
    if (!res.ok) {
      await this.parseUpstreamError(res, "BulkMail products request failed")
    }
    const raw = (await this.safeJson(res)) as {
      success?: boolean
      error?: string
      message?: string
      data?: any[]
      meta?: BulkMailCatalogPage["meta"]
    }
    if (raw && raw.success === false) {
      throw new BadRequestException(raw.error ?? raw.message ?? "BulkMail products failed.")
    }
    const items = Array.isArray(raw?.data) ? raw.data.map((d) => this.toCatalogProduct(d)) : []
    return {
      items,
      meta: raw?.meta ?? { current_page: 1, per_page: items.length, total: items.length, total_pages: 1 },
    }
  }

  /** All catalog products across every page (cap 10 pages / 1000 items). Cached 5 min. */
  async listAllCatalogProducts(): Promise<BulkMailCatalogProduct[]> {
    const now = Date.now()
    if (
      this.allCatalogCache &&
      now - this.allCatalogCache.at < BulkMailService.CATALOG_CACHE_TTL_MS
    ) {
      return this.allCatalogCache.items
    }
    const first = await this.listCatalogPage({ page: 1, perPage: 100 })
    const all = [...first.items]
    const totalPages = Math.min(first.meta.total_pages ?? 1, 10)
    for (let page = 2; page <= totalPages; page++) {
      const next = await this.listCatalogPage({ page, perPage: 100 })
      all.push(...next.items)
      if (next.items.length === 0) break
    }
    this.allCatalogCache = { at: now, items: all }
    return all
  }

  /** Single product details (public) mapped to the catalog shape. */
  async getCatalogProduct(productId: number): Promise<BulkMailCatalogProduct> {
    const { baseUrl } = await this.getConfig()
    if (!Number.isInteger(productId) || productId < 1) {
      throw new BadRequestException("Invalid BulkMail product id.")
    }
    const res = await this.fetchWithTimeout(`${baseUrl}/products/${productId}`, {
      headers: await this.publicHeaders(),
    })
    if (!res.ok) {
      await this.parseUpstreamError(res, "BulkMail product request failed")
    }
    const raw = (await this.safeJson(res)) as BulkMailEnvelope<unknown>
    if (raw && typeof raw === "object" && "success" in raw && raw.success === false) {
      throw new BadRequestException(raw.error ?? raw.message ?? "BulkMail product failed.")
    }
    const data = (raw as BulkMailEnvelope<any>).data ?? raw
    return this.toCatalogProduct(data)
  }

  /**
   * Pricing helper for the admin product editor: full details plus supplier
   * totals at several quantities (bulk tiers applied upstream).
   */
  async getPricePreview(productId: number): Promise<BulkMailPricePreview> {
    const product = await this.getCatalogProduct(productId)
    const previews = await Promise.all(
      [1, 10, 50, 100].map((qty) => this.calculatePrice(productId, qty).catch(() => null)),
    )
    return {
      product,
      previews: previews.filter((p): p is BulkMailPriceCalculation => p !== null),
    }
  }

  /** Auth header when a key is configured (public endpoints get a higher tier). */
  private async publicHeaders(): Promise<Record<string, string>> {
    const { apiKey } = await this.getConfig()
    return {
      Accept: "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    }
  }

  /** Bulk-tier price preview. Public endpoint — key attached when configured. */
  async calculatePrice(productId: number, quantity = 1): Promise<BulkMailPriceCalculation> {
    const { apiKey, baseUrl } = await this.getConfig()
    const res = await this.fetchWithTimeout(
      `${baseUrl}/products/${productId}/calculate-price`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "X-API-Key": apiKey } : {}),
        },
        body: JSON.stringify({ quantity }),
      },
    )
    if (!res.ok) {
      await this.parseUpstreamError(res, "BulkMail price calculation failed")
    }
    const raw = (await this.safeJson(res)) as BulkMailEnvelope<BulkMailPriceCalculation>
    if (raw && typeof raw === "object" && "success" in raw && raw.success === false) {
      throw new BadRequestException(raw.error ?? raw.message ?? "BulkMail price calculation failed.")
    }
    const data = (raw as BulkMailEnvelope<BulkMailPriceCalculation>).data as BulkMailPriceCalculation & {
      product_id?: number
      applied_price?: number
      total_amount?: number
      total_price?: number
      base_price?: number
      discount_percentage?: number
      bulk_pricing_applied?: boolean
      user_discount_applied?: boolean
      price_before_user_discount?: number
    }
    // Docs shape: { unit_price, total_price, discount_applied, savings }.
    // Live shape: { applied_price, total_amount, discount_percentage,
    // bulk_pricing_applied, user_discount_applied, price_before_user_discount }.
    const unitPrice = Number(data.unit_price ?? data.applied_price ?? 0)
    const totalPrice = Number(data.total_price ?? data.total_amount ?? 0)
    const discountApplied = Boolean(
      data.discount_applied ??
        data.bulk_pricing_applied ??
        data.user_discount_applied ??
        (Number(data.discount_percentage ?? 0) > 0),
    )
    const savings = Number(
      data.savings ??
        Math.max(0, Number(data.price_before_user_discount ?? totalPrice) - totalPrice).toFixed(8),
    )
    return {
      quantity: Number(data.quantity ?? quantity),
      unit_price: unitPrice,
      total_price: totalPrice,
      discount_applied: discountApplied,
      savings,
    }
  }

  /**
   * Purchases accounts from BulkMail. The API deducts the cost from the
   * configured BulkMail wallet and returns stock items immediately.
   * Mirrors Hotmail143 purchase() return shape for shared fulfillment.
   */
  async purchase(productId: number, quantity = 1): Promise<BulkMailPurchaseResult> {
    const { apiKey, baseUrl } = await this.getConfig()
    if (!apiKey) throw new BadRequestException("BulkMail API key is not configured.")
    if (!Number.isInteger(productId) || productId < 1) {
      throw new BadRequestException("Invalid BulkMail product id.")
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException("Quantity must be a positive integer.")
    }

    const res = await this.fetchWithTimeout(
      `${baseUrl}/orders`,
      {
        method: "POST",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, quantity }),
      },
      30000,
    )
    const raw = await this.safeJson(res)

    const envelope = raw as {
      success?: boolean
      message?: string
      error?: string
      errors?: Record<string, string[]>
      data?: {
        id?: number
        order_number?: string
        quantity?: number
        total_amount?: number
        status?: string
        stock_items?: unknown[]
      }
    }
    if (!res.ok || envelope.success === false || !envelope.data) {
      const fieldErrors = envelope.errors
        ? ` (${Object.entries(envelope.errors)
            .map(([k, v]) => `${k}: ${v.join(", ")}`)
            .join("; ")})`
        : ""
      const raw_detail = `${envelope.error ?? envelope.message ?? "BulkMail purchase failed."}${fieldErrors}`.trim()
      // Documented supplier error codes → actionable messages.
      if (/INSUFFICIENT_BALANCE/i.test(raw_detail)) {
        throw new BadRequestException(
          "BulkMail supplier wallet has insufficient balance — top it up and retry the fulfillment.",
        )
      }
      if (/INSUFFICIENT_STOCK/i.test(raw_detail)) {
        throw new BadRequestException("BulkMail has insufficient stock for this product and quantity.")
      }
      throw new BadRequestException(raw_detail)
    }

    const data = envelope.data
    const supplierOrderId = Number(data.id ?? 0) || undefined
    let stockItems: string[] = BulkMailService.extractStockItems(data)

    // The create response sometimes carries no items while the order itself
    // is already completed supplier-side — re-read it once before giving up.
    if (stockItems.length === 0 && supplierOrderId) {
      try {
        const fresh = await this.getOrder(supplierOrderId)
        if (fresh.stockItems.length > 0) stockItems = fresh.stockItems
      } catch {
        /* fall through to the empty-accounts error below */
      }
    }
    if (stockItems.length === 0) {
      throw new BulkMailOrderError("BulkMail returned no accounts.", supplierOrderId)
    }

    const accounts: BulkMailAccount[] = stockItems.map((entry) =>
      BulkMailService.parseAccount(entry),
    )

    const totalCost = Number(data.total_amount ?? 0)

    // Purchase response has no remaining balance — fetch best-effort for parity.
    let remainingBalance = 0
    try {
      const bal = await this.getBalance()
      remainingBalance = Number(bal.balance ?? 0)
    } catch {
      remainingBalance = 0
    }

    return {
      orderId: data.id ?? 0,
      orderNumber: data.order_number ?? String(data.id ?? 0),
      accounts,
      totalCost,
      remainingBalance,
    }
  }

  /** Supplier order list (paginated, optional status filter). */
  async listOrders(params?: {
    page?: number
    perPage?: number
    status?: string
  }): Promise<BulkMailOrderList> {
    const { apiKey, baseUrl } = await this.getConfig()
    if (!apiKey) throw new BadRequestException("BulkMail API key is not configured.")
    const qs = new URLSearchParams()
    qs.set("page", String(params?.page && params.page > 0 ? params.page : 1))
    qs.set("per_page", String(Math.min(100, Math.max(1, params?.perPage ?? 20))))
    const allowedStatus = ["pending", "processing", "completed", "cancelled"]
    if (params?.status && allowedStatus.includes(params.status)) qs.set("status", params.status)

    const res = await this.fetchWithTimeout(`${baseUrl}/orders?${qs.toString()}`, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
    })
    if (!res.ok) {
      await this.parseUpstreamError(res, "BulkMail orders request failed")
    }
    const raw = (await this.safeJson(res)) as {
      success?: boolean
      error?: string
      message?: string
      data?: any[]
      meta?: BulkMailOrderList["meta"]
    }
    if (raw && raw.success === false) {
      throw new BadRequestException(raw.error ?? raw.message ?? "BulkMail orders failed.")
    }
    const items = Array.isArray(raw?.data) ? raw.data.map((d) => this.toOrderItem(d)) : []
    return {
      items,
      meta: raw?.meta ?? {
        current_page: 1,
        per_page: items.length,
        total: items.length,
        total_pages: 1,
      },
    }
  }

  private toOrderItem(raw: any): BulkMailOrderItem {
    return {
      id: Number(raw?.id ?? 0),
      orderNumber: String(raw?.order_number ?? raw?.id ?? ""),
      productName: String(raw?.product_name ?? ""),
      quantity: Number(raw?.quantity ?? 1),
      unitPrice: Number(raw?.unit_price ?? 0),
      totalAmount: Number(raw?.total_amount ?? 0),
      status: String(raw?.status ?? ""),
      createdAt: String(raw?.created_at ?? ""),
      stockItems: BulkMailService.extractStockItems(raw),
    }
  }

  /**
   * Parses one supplier stock string into an account.
   * Shapes seen live: "email:password" and "email|password|refresh_token|client_id"
   * (e.g. Outlook token products). Whichever delimiter comes FIRST wins, so a
   * colon inside a pipe-format token (or a pipe inside a password) can't
   * mangle the split.
   */
  private static parseAccount(entry: string): BulkMailAccount {
    const text = (entry ?? "").trim()
    const pipeIdx = text.indexOf("|")
    const colonIdx = text.indexOf(":")
    if (pipeIdx >= 0 && (colonIdx < 0 || pipeIdx < colonIdx)) {
      const parts = text.split("|").map((p) => p.trim())
      return {
        email: parts[0] ?? "",
        password: parts[1] ?? "",
        refresh_token: parts[2] || undefined,
        client_id: parts.slice(3).join("|") || undefined,
      }
    }
    if (colonIdx > 0) {
      return {
        email: text.slice(0, colonIdx).trim(),
        password: text.slice(colonIdx + 1).trim(),
      }
    }
    return { email: text, password: "" }
  }

  /**
   * Stock arrives in two shapes: the documented `stock_items: ["email:pass"]`
   * on purchase, and `items: [{ id, data: "email|pass", sold_at }]` on order
   * details. Accept both, plus bare objects carrying a `data` string.
   */
  private static extractStockItems(data: any): string[] {
    const rawItems: unknown[] = Array.isArray(data?.stock_items)
      ? data.stock_items
      : Array.isArray(data?.items)
        ? data.items
        : []
    const out: string[] = []
    for (const entry of rawItems) {
      if (typeof entry === "string") {
        if (entry.trim()) out.push(entry)
      } else if (entry && typeof entry === "object") {
        const text = String((entry as Record<string, unknown>).data ?? "").trim()
        if (text) out.push(text)
      }
    }
    return out
  }

  /** Supplier order details (includes stock_items). */
  async getOrder(id: number): Promise<BulkMailOrderItem> {
    if (!Number.isInteger(id) || id < 1) {
      throw new BadRequestException("Invalid BulkMail order id.")
    }
    const data = await this.request<any>(`/orders/${id}`)
    return this.toOrderItem(data)
  }

  /**
   * Cancels a pending supplier order. Refund is credited to the BulkMail
   * wallet (not the customer) — the local order is untouched.
   */
  async cancelOrder(id: number): Promise<{ refundedAmount: number; message: string }> {
    const { apiKey, baseUrl } = await this.getConfig()
    if (!apiKey) throw new BadRequestException("BulkMail API key is not configured.")
    if (!Number.isInteger(id) || id < 1) {
      throw new BadRequestException("Invalid BulkMail order id.")
    }
    const res = await this.fetchWithTimeout(`${baseUrl}/orders/${id}/cancel`, {
      method: "POST",
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
    })
    const raw = await this.safeJson(res)
    const envelope = raw as {
      success?: boolean
      message?: string
      error?: string
      data?: { refunded_amount?: number }
    }
    if (!res.ok || envelope.success === false) {
      throw new BadRequestException(
        envelope.error ?? envelope.message ?? "BulkMail order cannot be cancelled.",
      )
    }
    return {
      refundedAmount: Number(envelope.data?.refunded_amount ?? 0),
      message: envelope.message ?? "Order cancelled successfully",
    }
  }

  /**
   * Re-exports supplier stock for an order. Response may be plain text, CSV
   * or JSON depending on format — returned raw for the admin download proxy.
   */
  async exportOrder(
    id: number,
    format: "txt" | "csv" | "json" = "txt",
  ): Promise<{ contentType: string; content: string }> {
    const { apiKey, baseUrl } = await this.getConfig()
    if (!apiKey) throw new BadRequestException("BulkMail API key is not configured.")
    if (!Number.isInteger(id) || id < 1) {
      throw new BadRequestException("Invalid BulkMail order id.")
    }
    const fmt: "txt" | "csv" | "json" = format === "csv" || format === "json" ? format : "txt"
    const res = await this.fetchWithTimeout(
      `${baseUrl}/orders/${id}/export?format=${fmt}`,
      { headers: { "X-API-Key": apiKey, Accept: "*/*" } },
    )
    if (!res.ok) {
      await this.parseUpstreamError(res, "BulkMail order export failed")
    }
    const contentType = res.headers.get("content-type") ?? "text/plain"
    const content = await res.text()
    if (!content) throw new BadRequestException("BulkMail returned an empty export.")
    return { contentType, content }
  }
}
