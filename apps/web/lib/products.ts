// Single sync currency-symbol store shared by server + client formatting.
// The async sources (useCurrencySymbol hook, getCurrencySymbol server helper)
// write through here so formatMoney() stays in sync.
let cachedCurrencySymbol: string = "BDT"

export function setCurrencySymbol(symbol: string) {
  if (symbol?.trim()) cachedCurrencySymbol = symbol
}

export function clearCurrencySymbol() {
  cachedCurrencySymbol = "BDT"
}

export function getCurrencySymbol(): string {
  return cachedCurrencySymbol
}
