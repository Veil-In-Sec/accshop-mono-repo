/**
 * Hotmail143 supplier client — port of
 * apps/api/src/hotmail143/hotmail143.service.ts (Hotmail143Service as module
 * functions; no framework dependencies).
 * API key / base URL are read from SiteSetting like the original.
 */

import { db } from "./db"
import {
  badRequest,
  fetchWithTimeout,
  parseUpstreamError,
  safeJson,
} from "./upstream"

const DEFAULT_BASE_URL = "https://www.hotmail143.com/api/v1"

export interface HotmailBalance {
  balance: number
  email: string
}

export interface HotmailAccount {
  email: string
  password: string
  refresh_token?: string
  client_id?: string
}

export interface HotmailPurchaseResult {
  orderId: number
  accounts: HotmailAccount[]
  totalCost: number
  remainingBalance: number
}

export interface HotmailProductOption {
  productType: string
  accountType: string
  name: string
  stock: number
}

export interface GmailCodeResult {
  successful: boolean
  code: number
  msg: string
  timestamp?: number
  data: { code: string | null; full_content?: string } | null
}

export interface HotmailCodeResult {
  successful: boolean
  code: number
  msg: string
  timestamp?: number
  data: {
    code: string | null
    messages?: unknown[]
    email?: string
    retryAfter?: number
    shouldRetry?: boolean
  } | null
}

export interface OutlookMail {
  sender_name?: string
  sender_email?: string
  subject?: string
  body_text?: string
  received_at?: number
  site?: string
}

export interface OutlookCodeResult {
  successful: boolean
  code: number
  msg: string
  timestamp?: number
  data: {
    code: string | null
    email?: string
    address?: string
    expires_at?: string
    mail?: OutlookMail | null
    retryAfter?: number
    shouldRetry?: boolean
    reordered?: boolean
    new_email?: string | null
    needs_topup?: boolean
  } | null
  history?: Array<{ code: string; created_at: string }>
}

async function getConfig(): Promise<{ apiKey: string | null; baseUrl: string }> {
  const settings = await db.siteSetting.findUnique({ where: { id: 1 } })
  return {
    apiKey: settings?.hotmailApiKey ?? null,
    baseUrl: (settings?.hotmailApiBaseUrl || DEFAULT_BASE_URL).replace(/\/+$/, ""),
  }
}

/**
 * Purchases accounts from Hotmail143. The API deducts the cost from the
 * configured Hotmail143 balance and returns the account credentials.
 */
export async function hotmailPurchase(
  productType: string,
  accountType: string,
  quantity = 1,
): Promise<HotmailPurchaseResult> {
  const { apiKey, baseUrl } = await getConfig()
  if (!apiKey) badRequest("Hotmail143 API key is not configured.")

  const body = new URLSearchParams()
  body.set("api_key", apiKey as string)
  body.set("product_type", productType)
  body.set("account_type", accountType)
  body.set("quantity", String(quantity))

  const res = await fetchWithTimeout(
    `${baseUrl}/purchase`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
    30000,
    "Hotmail143",
  )
  const raw = await safeJson(res, "Hotmail143")

  const data = raw as {
    status?: string
    message?: string
    data?: {
      order_id?: number
      accounts?: unknown[]
      unit_price?: string
      total_price?: number
      quantity?: number
      balance?: string
    }
  }
  if (data.status !== "success" || !data.data) {
    badRequest(data.message || "Hotmail143 purchase failed.")
  }

  const accounts: HotmailAccount[] = (data.data?.accounts ?? []).map((entry) => {
    if (typeof entry === "string") {
      const parts = entry.split("|")
      return {
        email: parts[0] ?? "",
        password: parts[1] ?? "",
        refresh_token: parts[2] ?? undefined,
        client_id: parts[3] ?? undefined,
      }
    }
    const obj = entry as Record<string, string>
    return {
      email: obj.email ?? obj.login ?? obj.username ?? "",
      password: obj.password ?? obj.pass ?? "",
      refresh_token: obj.refresh_token ?? obj.refreshToken ?? undefined,
      client_id: obj.client_id ?? obj.clientId ?? undefined,
    }
  })

  return {
    orderId: data.data?.order_id ?? 0,
    accounts,
    totalCost: data.data?.total_price ?? 0,
    remainingBalance: parseFloat(data.data?.balance ?? "0"),
  }
}

export async function hotmailRequest<T>(path: string): Promise<T> {
  const { apiKey, baseUrl } = await getConfig()
  if (!apiKey) badRequest("Hotmail143 API key is not configured.")

  const sep = path.includes("?") ? "&" : "?"
  const url = `${baseUrl}${path}${sep}api_key=${encodeURIComponent(apiKey as string)}`

  const res = await fetchWithTimeout(url, undefined, 20000, "Hotmail143")
  if (!res.ok) {
    await parseUpstreamError(res, "Hotmail143 API request failed")
  }
  return (await safeJson(res, "Hotmail143")) as T
}

/** Fetches the current Hotmail143 account balance. */
export async function getHotmailBalance(): Promise<HotmailBalance> {
  const data = await hotmailRequest<{
    status: string
    data?: { balance: number; email?: string }
  }>("/balance")
  if (data.status !== "success" || !data.data) {
    badRequest("Could not retrieve the Hotmail143 balance.")
  }
  return { balance: data.data.balance, email: data.data.email ?? "" }
}

/** Fetches stock counts grouped by product type → account type. */
export async function getHotmailStock(productType?: string, accountType?: string) {
  const params = new URLSearchParams()
  if (productType) params.set("product_type", productType)
  if (accountType) params.set("account_type", accountType)
  const qs = params.toString()
  const path = qs ? `/stock?${qs}` : "/stock"
  return hotmailRequest(path)
}

/**
 * Returns the list of selectable products sourced from Hotmail143 stock.
 * Each entry is a (productType, accountType) pair with a human-readable name
 * and the current stock count.
 */
export async function listHotmailProducts(): Promise<HotmailProductOption[]> {
  const result = await getHotmailStock()
  const raw = (result as { data?: { products?: Record<string, Record<string, number> | number> } }).data?.products ?? {}
  const options: HotmailProductOption[] = []
  const prettify = (value: string) =>
    value
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")

  for (const [productType, accounts] of Object.entries(raw)) {
    if (productType === "total") continue
    if (typeof accounts === "number") {
      options.push({
        productType,
        accountType: productType,
        name: prettify(productType),
        stock: accounts,
      })
      continue
    }
    for (const [accountType, count] of Object.entries(accounts)) {
      if (typeof count !== "number") continue
      options.push({
        productType,
        accountType,
        name: `${prettify(productType)} ${accountType}`,
        stock: count,
      })
    }
  }
  return options
}

/**
 * GET /gmail/code?api_key=...&email=...
 * Returns the latest Gmail verification code for the address.
 * When no OTP is available the upstream returns { successful:false, code:500, msg:"No otp" }.
 */
export async function getGmailCode(email: string): Promise<GmailCodeResult> {
  const { apiKey, baseUrl } = await getConfig()
  if (!apiKey) badRequest("Hotmail143 API key is not configured.")
  const url = `${baseUrl}/gmail/code?api_key=${encodeURIComponent(apiKey as string)}&email=${encodeURIComponent(email)}`
  const res = await fetchWithTimeout(url, undefined, 20000, "Hotmail143")
  if (!res.ok) {
    await parseUpstreamError(res, "Hotmail143 Gmail code request failed")
  }
  return (await safeJson(res, "Hotmail143")) as GmailCodeResult
}

/**
 * POST /hotmail-code with form fields api_key + data="email|password|refresh_token|client_id".
 * Returns { successful:true, data:{code,...} } or retry { successful:false, code:-2, data:{shouldRetry:true, retryAfter:10} }.
 */
export async function getHotmailCode(pipeData: string): Promise<HotmailCodeResult> {
  const { apiKey, baseUrl } = await getConfig()
  if (!apiKey) badRequest("Hotmail143 API key is not configured.")
  const body = new URLSearchParams()
  body.set("api_key", apiKey as string)
  body.set("data", pipeData)
  const res = await fetchWithTimeout(
    `${baseUrl}/hotmail-code`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
    30000,
    "Hotmail143",
  )
  if (!res.ok) {
    await parseUpstreamError(res, "Hotmail143 Hotmail code request failed")
  }
  return (await safeJson(res, "Hotmail143")) as HotmailCodeResult
}

/**
 * GET /outlook-code?api_key=...&email=...
 * Reads the verification code for a purchased Outlook address (follows renewals).
 * May auto-renew the address (charged) -> data.reordered=true + data.new_email.
 * Waiting -> { successful:false, code:-2, data:{shouldRetry:true, retryAfter:10} }.
 * Expired -> { successful:false, code:-3, data:{shouldRetry:false} } (do not retry).
 */
export async function getOutlookCode(email: string): Promise<OutlookCodeResult> {
  const { apiKey, baseUrl } = await getConfig()
  if (!apiKey) badRequest("Hotmail143 API key is not configured.")
  const url = `${baseUrl}/outlook-code?api_key=${encodeURIComponent(apiKey as string)}&email=${encodeURIComponent(email)}`
  const res = await fetchWithTimeout(url, undefined, 20000, "Hotmail143")
  if (!res.ok) {
    await parseUpstreamError(res, "Hotmail143 Outlook code request failed")
  }
  return (await safeJson(res, "Hotmail143")) as OutlookCodeResult
}
