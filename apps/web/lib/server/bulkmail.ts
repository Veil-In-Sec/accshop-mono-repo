/**
 * BulkMail supplier client — port of
 * apps/api/src/bulkmail/bulkmail.service.ts (BulkMailService as module
 * functions; no framework dependencies).
 * API key / base URL are read from SiteSetting like the original.
 */

import { db } from "./db"
import {
  HttpError,
  badRequest,
  fetchWithTimeout,
  safeJson,
} from "./upstream"

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
export class BulkMailOrderError extends HttpError {
  readonly supplierOrderId?: number

  constructor(message: string, supplierOrderId?: number) {
    super(400, message)
    this.name = "BulkMailOrderError"
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

async function getConfig(): Promise<{ apiKey: string | null; baseUrl: string }> {
  const settings = await db.siteSetting.findUnique({ where: { id: 1 } })
  return {
    apiKey: settings?.bulkmailApiKey ?? null,
    baseUrl: (settings?.bulkmailApiBaseUrl || DEFAULT_BASE_URL).replace(/\/+$/, ""),
  }
}

// NOTE (multi-instance limitation): these caches live in process memory.
// On multi-instance / serverless deployments each instance keeps its own
// copy, so different instances may briefly disagree (stale ≤ TTL). Same
// trade-off as the NestJS single-instance in-memory cache in the source.
const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000
let catalogCache: { at: number; items: BulkMailProductOption[] } | null = null
let allCatalogCache: { at: number; items: BulkMailCatalogProduct[] } | null = null

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiKey, baseUrl } = await getConfig()
  if (!apiKey) badRequest("BulkMail API key is not configured.")

  const url = `${baseUrl}${path}`
  const res = await fetchWithTimeout(
    url,
    {
      ...init,
      headers: {
        "X-API-Key": apiKey as string,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...((init?.headers as Record<string, string> | undefined) ?? {}),
      },
    },
    20000,
    "BulkMail",
  )
  if (!res.ok) {
    await parseRequestError(res)
  }
  const raw = (await safeJson(res, "BulkMail")) as BulkMailEnvelope<T>
  if (raw && typeof raw === "object" && "success" in raw && raw.success === false) {
    const detail = raw.error ?? raw.message ?? "BulkMail request failed."
    badRequest(detail)
  }
  // Endpoints return { success, data, ... } — unwrap data when present.
  if (raw && typeof raw === "object" && "data" in raw && "success" in raw) {
    return raw.data as T
  }
  return raw as T
}

async function parseRequestError(res: Response): Promise<never> {
  let detail = "BulkMail API request failed"
  try {
    const body = (await res.json()) as {
      message?: string
      error?: string
      msg?: string
      errors?: Record<string, string[]>
    }
    detail = body.error ?? body.message ?? body.msg ?? detail
    const fieldErrors = body.errors
      ? ` (${Object.entries(body.errors)
          .map(([k, v]) => `${k}: ${v.join(", ")}`)
          .join("; ")})`
      : ""
    if (fieldErrors && fieldErrors !== " ()") detail += fieldErrors
  } catch {
    /* keep fallback */
  }
  throw new HttpError(400, `BulkMail API request failed (${res.status}${detail ? `: ${detail}` : ""}).`)
}

/**
 * Parses one supplier stock string into an account.
 * Shapes seen live: "email:password" and "email|password|refresh_token|client_id"
 * (e.g. Outlook token products). Whichever delimiter comes FIRST wins, so a
 * colon inside a pipe-format token (or a pipe inside a password) can't
 * mangle the split.
 */
function parseAccount(entry: string): BulkMailAccount {
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
function extractStockItems(data: any): string[] {
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

function toOrderItem(raw: any): BulkMailOrderItem {
  return {
    id: Number(raw?.id ?? 0),
    orderNumber: String(raw?.order_number ?? raw?.id ?? ""),
    productName: String(raw?.product_name ?? ""),
    quantity: Number(raw?.quantity ?? 1),
    unitPrice: Number(raw?.unit_price ?? 0),
    totalAmount: Number(raw?.total_amount ?? 0),
    status: String(raw?.status ?? ""),
    createdAt: String(raw?.created_at ?? ""),
    stockItems: extractStockItems(raw),
  }
}

/** Supplier order details (includes stock_items). */
export async function getBulkMailOrder(id: number): Promise<BulkMailOrderItem> {
  if (!Number.isInteger(id) || id < 1) {
    badRequest("Invalid BulkMail order id.")
  }
  const data = await request<any>(`/orders/${id}`)
  return toOrderItem(data)
}

/** Fetches the current BulkMail wallet balance. Mirrors Hotmail143 getBalance(). */
export async function getBulkMailBalance(): Promise<{
  balance: number
  email: string
  currency: string
}> {
  const data = await request<{ balance: number; currency: string }>("/wallet/balance")
  // Best-effort email for admin display parity with Hotmail143 (balance + email).
  let email = ""
  try {
    const profile = await request<{ email?: string }>("/user/profile")
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

/**
 * Purchases accounts from BulkMail. The API deducts the cost from the
 * configured BulkMail wallet and returns stock items immediately.
 * Mirrors Hotmail143 purchase() return shape for shared fulfillment.
 */
export async function bulkmailPurchase(
  productId: number,
  quantity = 1,
): Promise<BulkMailPurchaseResult> {
  const { apiKey, baseUrl } = await getConfig()
  if (!apiKey) badRequest("BulkMail API key is not configured.")
  if (!Number.isInteger(productId) || productId < 1) {
    badRequest("Invalid BulkMail product id.")
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    badRequest("Quantity must be a positive integer.")
  }

  const res = await fetchWithTimeout(
    `${baseUrl}/orders`,
    {
      method: "POST",
      headers: { "X-API-Key": apiKey as string, "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, quantity }),
    },
    30000,
    "BulkMail",
  )
  const raw = await safeJson(res, "BulkMail")

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
      badRequest(
        "BulkMail supplier wallet has insufficient balance — top it up and retry the fulfillment.",
      )
    }
    if (/INSUFFICIENT_STOCK/i.test(raw_detail)) {
      badRequest("BulkMail has insufficient stock for this product and quantity.")
    }
    badRequest(raw_detail)
  }

  const data = envelope.data as NonNullable<typeof envelope.data>
  const supplierOrderId = Number(data.id ?? 0) || undefined
  let stockItems: string[] = extractStockItems(data)

  // The create response sometimes carries no items while the order itself
  // is already completed supplier-side — re-read it once before giving up.
  if (stockItems.length === 0 && supplierOrderId) {
    try {
      const fresh = await getBulkMailOrder(supplierOrderId)
      if (fresh.stockItems.length > 0) stockItems = fresh.stockItems
    } catch {
      /* fall through to the empty-accounts error below */
    }
  }
  if (stockItems.length === 0) {
    throw new BulkMailOrderError("BulkMail returned no accounts.", supplierOrderId)
  }

  const accounts: BulkMailAccount[] = stockItems.map((entry) => parseAccount(entry))

  const totalCost = Number(data.total_amount ?? 0)

  // Purchase response has no remaining balance — fetch best-effort for parity.
  let remainingBalance = 0
  try {
    const bal = await getBulkMailBalance()
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

/** Fetches realtime stock for all products. Mirrors Hotmail143 getStock(). */
export async function getBulkMailStock() {
  const { apiKey, baseUrl } = await getConfig()
  if (!apiKey) badRequest("BulkMail API key is not configured.")
  // /stock is public but we still send the key when configured (rate-limit tier).
  const res = await fetchWithTimeout(
    `${baseUrl}/stock`,
    {
      headers: {
        Accept: "application/json",
        ...(apiKey ? { "X-API-Key": apiKey } : {}),
      },
    },
    20000,
    "BulkMail",
  )
  if (!res.ok) {
    await parseRequestError(res)
  }
  return safeJson(res, "BulkMail")
}

/** Returns a flattened `"<productId>"` → count map. Mirrors Hotmail143 getStockMap(). */
export async function getBulkMailStockMap(): Promise<Map<string, number>> {
  const result = await getBulkMailStock()
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
export async function listBulkMailProducts(): Promise<BulkMailProductOption[]> {
  const now = Date.now()
  if (catalogCache && now - catalogCache.at < CATALOG_CACHE_TTL_MS) {
    return catalogCache.items
  }
  const [catalog, stockMap] = await Promise.all([
    listAllBulkMailCatalogProducts(),
    getBulkMailStockMap().catch(() => new Map<string, number>()),
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
  catalogCache = { at: now, items }
  return items
}

function toCatalogProduct(raw: any): BulkMailCatalogProduct {
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

/** Auth header when a key is configured (public endpoints get a higher tier). */
async function publicHeaders(): Promise<Record<string, string>> {
  const { apiKey } = await getConfig()
  return {
    Accept: "application/json",
    ...(apiKey ? { "X-API-Key": apiKey } : {}),
  }
}

/**
 * One catalog page straight from GET /products with the documented filters.
 * Public endpoint — API key is attached when configured (higher rate tier).
 */
export async function listBulkMailCatalogPage(params?: {
  page?: number
  perPage?: number
  search?: string
  inStock?: boolean
  sort?: string
  order?: string
}): Promise<BulkMailCatalogPage> {
  const { baseUrl } = await getConfig()
  const qs = new URLSearchParams()
  qs.set("page", String(params?.page && params.page > 0 ? params.page : 1))
  qs.set("per_page", String(Math.min(100, Math.max(1, params?.perPage ?? 20))))
  if (params?.search?.trim()) qs.set("search", params.search.trim())
  if (params?.inStock !== undefined) qs.set("in_stock", params.inStock ? "true" : "false")
  const allowedSort = ["name", "price", "stock_quantity", "created_at"]
  if (params?.sort && allowedSort.includes(params.sort)) qs.set("sort", params.sort)
  if (params?.order === "asc" || params?.order === "desc") qs.set("order", params.order)

  const res = await fetchWithTimeout(
    `${baseUrl}/products?${qs.toString()}`,
    {
      headers: await publicHeaders(),
    },
    20000,
    "BulkMail",
  )
  if (!res.ok) {
    await parseRequestError(res)
  }
  const raw = (await safeJson(res, "BulkMail")) as {
    success?: boolean
    error?: string
    message?: string
    data?: any[]
    meta?: BulkMailCatalogPage["meta"]
  }
  if (raw && raw.success === false) {
    badRequest(raw.error ?? raw.message ?? "BulkMail products failed.")
  }
  const items = Array.isArray(raw?.data) ? raw.data.map((d) => toCatalogProduct(d)) : []
  return {
    items,
    meta: raw?.meta ?? { current_page: 1, per_page: items.length, total: items.length, total_pages: 1 },
  }
}

/** All catalog products across every page (cap 10 pages / 1000 items). Cached 5 min. */
export async function listAllBulkMailCatalogProducts(): Promise<BulkMailCatalogProduct[]> {
  const now = Date.now()
  if (allCatalogCache && now - allCatalogCache.at < CATALOG_CACHE_TTL_MS) {
    return allCatalogCache.items
  }
  const first = await listBulkMailCatalogPage({ page: 1, perPage: 100 })
  const all = [...first.items]
  const totalPages = Math.min(first.meta.total_pages ?? 1, 10)
  for (let page = 2; page <= totalPages; page++) {
    const next = await listBulkMailCatalogPage({ page, perPage: 100 })
    all.push(...next.items)
    if (next.items.length === 0) break
  }
  allCatalogCache = { at: now, items: all }
  return all
}

/** Single product details (public) mapped to the catalog shape. */
export async function getBulkMailCatalogProduct(productId: number): Promise<BulkMailCatalogProduct> {
  const { baseUrl } = await getConfig()
  if (!Number.isInteger(productId) || productId < 1) {
    badRequest("Invalid BulkMail product id.")
  }
  const res = await fetchWithTimeout(
    `${baseUrl}/products/${productId}`,
    {
      headers: await publicHeaders(),
    },
    20000,
    "BulkMail",
  )
  if (!res.ok) {
    await parseRequestError(res)
  }
  const raw = (await safeJson(res, "BulkMail")) as BulkMailEnvelope<unknown>
  if (raw && typeof raw === "object" && "success" in raw && raw.success === false) {
    badRequest(raw.error ?? raw.message ?? "BulkMail product failed.")
  }
  const data = (raw as BulkMailEnvelope<any>).data ?? raw
  return toCatalogProduct(data)
}

/**
 * Pricing helper for the admin product editor: full details plus supplier
 * totals at several quantities (bulk tiers applied upstream).
 */
export async function getBulkMailPricePreview(productId: number): Promise<BulkMailPricePreview> {
  const product = await getBulkMailCatalogProduct(productId)
  const previews = await Promise.all(
    [1, 10, 50, 100].map((qty) => calculateBulkMailPrice(productId, qty).catch(() => null)),
  )
  return {
    product,
    previews: previews.filter((p): p is BulkMailPriceCalculation => p !== null),
  }
}

/** Bulk-tier price preview. Public endpoint — key attached when configured. */
export async function calculateBulkMailPrice(
  productId: number,
  quantity = 1,
): Promise<BulkMailPriceCalculation> {
  const { apiKey, baseUrl } = await getConfig()
  const res = await fetchWithTimeout(
    `${baseUrl}/products/${productId}/calculate-price`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "X-API-Key": apiKey } : {}),
      },
      body: JSON.stringify({ quantity }),
    },
    20000,
    "BulkMail",
  )
  if (!res.ok) {
    await parseRequestError(res)
  }
  const raw = (await safeJson(res, "BulkMail")) as BulkMailEnvelope<BulkMailPriceCalculation>
  if (raw && typeof raw === "object" && "success" in raw && raw.success === false) {
    badRequest(raw.error ?? raw.message ?? "BulkMail price calculation failed.")
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

/** Supplier order list (paginated, optional status filter). */
export async function listBulkMailOrders(params?: {
  page?: number
  perPage?: number
  status?: string
}): Promise<BulkMailOrderList> {
  const { apiKey, baseUrl } = await getConfig()
  if (!apiKey) badRequest("BulkMail API key is not configured.")
  const qs = new URLSearchParams()
  qs.set("page", String(params?.page && params.page > 0 ? params.page : 1))
  qs.set("per_page", String(Math.min(100, Math.max(1, params?.perPage ?? 20))))
  const allowedStatus = ["pending", "processing", "completed", "cancelled"]
  if (params?.status && allowedStatus.includes(params.status)) qs.set("status", params.status)

  const res = await fetchWithTimeout(
    `${baseUrl}/orders?${qs.toString()}`,
    {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
    },
    20000,
    "BulkMail",
  )
  if (!res.ok) {
    await parseRequestError(res)
  }
  const raw = (await safeJson(res, "BulkMail")) as {
    success?: boolean
    error?: string
    message?: string
    data?: any[]
    meta?: BulkMailOrderList["meta"]
  }
  if (raw && raw.success === false) {
    badRequest(raw.error ?? raw.message ?? "BulkMail orders failed.")
  }
  const items = Array.isArray(raw?.data) ? raw.data.map((d) => toOrderItem(d)) : []
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

/**
 * Cancels a pending supplier order. Refund is credited to the BulkMail
 * wallet (not the customer) — the local order is untouched.
 */
export async function cancelBulkMailOrder(
  id: number,
): Promise<{ refundedAmount: number; message: string }> {
  const { apiKey, baseUrl } = await getConfig()
  if (!apiKey) badRequest("BulkMail API key is not configured.")
  if (!Number.isInteger(id) || id < 1) {
    badRequest("Invalid BulkMail order id.")
  }
  const res = await fetchWithTimeout(
    `${baseUrl}/orders/${id}/cancel`,
    {
      method: "POST",
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
    },
    20000,
    "BulkMail",
  )
  const raw = await safeJson(res, "BulkMail")
  const envelope = raw as {
    success?: boolean
    message?: string
    error?: string
    data?: { refunded_amount?: number }
  }
  if (!res.ok || envelope.success === false) {
    badRequest(envelope.error ?? envelope.message ?? "BulkMail order cannot be cancelled.")
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
export async function exportBulkMailOrder(
  id: number,
  format: "txt" | "csv" | "json" = "txt",
): Promise<{ contentType: string; content: string }> {
  const { apiKey, baseUrl } = await getConfig()
  if (!apiKey) badRequest("BulkMail API key is not configured.")
  if (!Number.isInteger(id) || id < 1) {
    badRequest("Invalid BulkMail order id.")
  }
  const fmt: "txt" | "csv" | "json" = format === "csv" || format === "json" ? format : "txt"
  const res = await fetchWithTimeout(
    `${baseUrl}/orders/${id}/export?format=${fmt}`,
    { headers: { "X-API-Key": apiKey, Accept: "*/*" } },
    20000,
    "BulkMail",
  )
  if (!res.ok) {
    await parseRequestError(res)
  }
  const contentType = res.headers.get("content-type") ?? "text/plain"
  const content = await res.text()
  if (!content) badRequest("BulkMail returned an empty export.")
  return { contentType, content }
}
