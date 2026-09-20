// Dynamic currency symbol - defaults to BDT but can be overridden by settings
let cachedCurrencySymbol: string = "BDT"

export function setCurrencySymbol(symbol: string) {
  cachedCurrencySymbol = symbol
}

export function getCurrencySymbol(): string {
  return cachedCurrencySymbol
}

// For backward compatibility - deprecated, use getCurrencySymbol()
export const currencySymbol = "BDT"
