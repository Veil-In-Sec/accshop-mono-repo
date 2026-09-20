import { Injectable, BadRequestException } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.module"
import {
  fetchWithTimeout as upstreamFetch,
  parseUpstreamError as upstreamError,
  safeJson as upstreamJson,
} from "../common/upstream-http"

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

@Injectable()
export class Hotmail143Service {
  constructor(private readonly prisma: PrismaService) {}

  private async getConfig(): Promise<{ apiKey: string | null; baseUrl: string }> {
    const settings = await this.prisma.siteSetting.findUnique({ where: { id: 1 } })
    return {
      apiKey: settings?.hotmailApiKey ?? null,
      baseUrl: (settings?.hotmailApiBaseUrl || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    }
  }

  private async parseUpstreamError(res: Response, fallback: string): Promise<never> {
    return upstreamError(res, fallback)
  }

  private async fetchWithTimeout(url: string, init?: RequestInit, ms = 20000): Promise<Response> {
    return upstreamFetch(url, init, ms, "Hotmail143")
  }

  /** Fetches the current Hotmail143 account balance. */
  async getBalance(): Promise<HotmailBalance> {
    const data = await this.request<{
      status: string
      data?: { balance: number; email?: string }
    }>("/balance")
    if (data.status !== "success" || !data.data) {
      throw new BadRequestException("Could not retrieve the Hotmail143 balance.")
    }
    return { balance: data.data.balance, email: data.data.email ?? "" }
  }

  /** Fetches stock counts grouped by product type → account type. */
  async getStock(productType?: string, accountType?: string) {
    const params = new URLSearchParams()
    if (productType) params.set("product_type", productType)
    if (accountType) params.set("account_type", accountType)
    const qs = params.toString()
    const path = qs ? `/stock?${qs}` : "/stock"
    return this.request(path)
  }

  private async safeJson(res: Response): Promise<any> {
    return upstreamJson(res, "Hotmail143")
  }

  /**
   * Purchases accounts from Hotmail143. The API deducts the cost from the
   * configured Hotmail143 balance and returns the account credentials.
   */
  async purchase(productType: string, accountType: string, quantity = 1): Promise<HotmailPurchaseResult> {
    const { apiKey, baseUrl } = await this.getConfig()
    if (!apiKey) throw new BadRequestException("Hotmail143 API key is not configured.")

    const body = new URLSearchParams()
    body.set("api_key", apiKey)
    body.set("product_type", productType)
    body.set("account_type", accountType)
    body.set("quantity", String(quantity))

    const res = await this.fetchWithTimeout(
      `${baseUrl}/purchase`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      },
      30000,
    )
    const raw = await this.safeJson(res)

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
      throw new BadRequestException(data.message || "Hotmail143 purchase failed.")
    }

    const accounts: HotmailAccount[] = (data.data.accounts ?? []).map((entry) => {
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
      orderId: data.data.order_id ?? 0,
      accounts,
      totalCost: data.data.total_price ?? 0,
      remainingBalance: parseFloat(data.data.balance ?? "0"),
    }
  }

  /**
   * Returns the list of selectable products sourced from Hotmail143 stock.
   * Each entry is a (productType, accountType) pair with a human-readable name
   * and the current stock count.
   */
  async listProducts(): Promise<HotmailProductOption[]> {
    const result = await this.getStock()
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

  private async request<T>(path: string): Promise<T> {
    const { apiKey, baseUrl } = await this.getConfig()
    if (!apiKey) throw new BadRequestException("Hotmail143 API key is not configured.")

    const sep = path.includes("?") ? "&" : "?"
    const url = `${baseUrl}${path}${sep}api_key=${encodeURIComponent(apiKey)}`

    const res = await this.fetchWithTimeout(url)
    if (!res.ok) {
      await this.parseUpstreamError(res, "Hotmail143 API request failed")
    }
    return (await this.safeJson(res)) as T
  }

  /**
   * GET /gmail/code?api_key=...&email=...
   * Returns the latest Gmail verification code for the address.
   * When no OTP is available the upstream returns { successful:false, code:500, msg:"No otp" }.
   */
  async getGmailCode(email: string): Promise<GmailCodeResult> {
    const { apiKey, baseUrl } = await this.getConfig()
    if (!apiKey) throw new BadRequestException("Hotmail143 API key is not configured.")
    const url = `${baseUrl}/gmail/code?api_key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}`
    const res = await this.fetchWithTimeout(url)
    if (!res.ok) {
      await this.parseUpstreamError(res, "Hotmail143 Gmail code request failed")
    }
    return (await this.safeJson(res)) as GmailCodeResult
  }

  /**
   * POST /hotmail-code with form fields api_key + data="email|password|refresh_token|client_id".
   * Returns { successful:true, data:{code,...} } or retry { successful:false, code:-2, data:{shouldRetry:true, retryAfter:10} }.
   */
  async getHotmailCode(pipeData: string): Promise<HotmailCodeResult> {
    const { apiKey, baseUrl } = await this.getConfig()
    if (!apiKey) throw new BadRequestException("Hotmail143 API key is not configured.")
    const body = new URLSearchParams()
    body.set("api_key", apiKey)
    body.set("data", pipeData)
    const res = await this.fetchWithTimeout(
      `${baseUrl}/hotmail-code`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      },
      30000,
    )
    if (!res.ok) {
      await this.parseUpstreamError(res, "Hotmail143 Hotmail code request failed")
    }
    return (await this.safeJson(res)) as HotmailCodeResult
  }

  /**
   * GET /outlook-code?api_key=...&email=...
   * Reads the verification code for a purchased Outlook address (follows renewals).
   * May auto-renew the address (charged) -> data.reordered=true + data.new_email.
   * Waiting -> { successful:false, code:-2, data:{shouldRetry:true, retryAfter:10} }.
   * Expired -> { successful:false, code:-3, data:{shouldRetry:false} } (do not retry).
   */
  async getOutlookCode(email: string): Promise<OutlookCodeResult> {
    const { apiKey, baseUrl } = await this.getConfig()
    if (!apiKey) throw new BadRequestException("Hotmail143 API key is not configured.")
    const url = `${baseUrl}/outlook-code?api_key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}`
    const res = await this.fetchWithTimeout(url)
    if (!res.ok) {
      await this.parseUpstreamError(res, "Hotmail143 Outlook code request failed")
    }
    return (await this.safeJson(res)) as OutlookCodeResult
  }
}
