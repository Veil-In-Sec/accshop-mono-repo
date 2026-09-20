import { getCurrencySymbol } from "./products"

/** Formats an amount with the site currency, e.g. `BDT 100.00`. Guards NaN/Infinity. */
export function formatMoney(value: number | string): string {
  const n = Number(value)
  const safe = Number.isFinite(n) ? n : 0
  return `${getCurrencySymbol()}${safe.toFixed(2)}`
}

/** Line total for a unit price × quantity, formatted with the site currency. */
export function formatLineTotal(price: number | string, quantity?: number | null): string {
  const p = Number(price)
  const q = Number(quantity ?? 1)
  const safe = Number.isFinite(p) && Number.isFinite(q) ? p * q : 0
  return formatMoney(safe)
}
