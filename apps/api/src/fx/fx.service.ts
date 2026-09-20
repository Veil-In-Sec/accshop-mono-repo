import { Injectable } from "@nestjs/common"

export interface FxRate {
  /** USD → local multiplier actually used. */
  rate: number
  /** "live" = fresh from the internet, "flat" = locked manual value, "manual" = fallback. */
  source: "live" | "flat" | "manual"
  /** When the live rate was fetched (null for flat/manual). */
  fetchedAt: string | null
}

const LIVE_URL = "https://open.er-api.com/v6/latest/USD"
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 6000

/**
 * Live USD → local (e.g. BDT) exchange rate with zero-config behavior.
 * Result is cached in memory for 6h; any failure (offline, unknown currency,
 * upstream error) falls back to the manual `usdToLocalRate` setting — and to
 * a stale cached value first — so purchases and admin pages never break.
 */
@Injectable()
export class FxService {
  private readonly cache = new Map<string, { rate: number; at: number }>()

  async getUsdToLocalRate(
    currencySymbol: string,
    manualRate: number,
    liveEnabled = true,
  ): Promise<FxRate> {
    const code = (currencySymbol || "BDT").trim().toUpperCase()
    const safeManual = Number.isFinite(manualRate) && manualRate > 0 ? manualRate : 1
    if (code === "USD") return { rate: 1, source: "manual", fetchedAt: null }
    // Flat mode: locked manual value, never hits the internet.
    if (!liveEnabled) return { rate: safeManual, source: "flat", fetchedAt: null }

    const now = Date.now()
    const hit = this.cache.get(code)
    if (hit && now - hit.at < CACHE_TTL_MS && Number.isFinite(hit.rate) && hit.rate > 0) {
      return { rate: hit.rate, source: "live", fetchedAt: new Date(hit.at).toISOString() }
    }

    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
      try {
        const res = await fetch(LIVE_URL, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
        })
        if (!res.ok) throw new Error(`FX upstream responded ${res.status}`)
        const body = (await res.json()) as {
          result?: string
          rates?: Record<string, number>
        }
        const live = body?.rates?.[code]
        if (!Number.isFinite(live) || (live as number) <= 0) {
          throw new Error(`No live USD→${code} rate`)
        }
        const rate = live as number
        this.cache.set(code, { rate, at: now })
        return { rate, source: "live", fetchedAt: new Date(now).toISOString() }
      } finally {
        clearTimeout(t)
      }
    } catch {
      // Prefer a stale cached live rate over the manual value when available.
      if (hit && Number.isFinite(hit.rate) && hit.rate > 0) {
        return { rate: hit.rate, source: "live", fetchedAt: new Date(hit.at).toISOString() }
      }
      return { rate: safeManual, source: "manual", fetchedAt: null }
    }
  }
}
