"use client"

import useSWR from "swr"
import { serverApi } from "@/lib/api/endpoints"
import {
  getCurrencySymbol as getCachedSymbol,
  setCurrencySymbol as setCachedSymbol,
  clearCurrencySymbol,
} from "@/lib/products"

export function useCurrencySymbol() {
  const { data, isLoading } = useSWR(
    "currency-symbol",
    async () => {
      const cached = getCachedSymbol()
      if (cached !== "BDT") return cached
      const settings = await serverApi.settings.getPublic()
      const symbol = settings?.currencySymbol ?? "BDT"
      setCachedSymbol(symbol)
      return symbol
    },
    {
      fallbackData: "BDT",
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )

  return { currencySymbol: data ?? "BDT", isLoading }
}

export { clearCurrencySymbol as clearCurrencySymbolCache }
export { setCachedSymbol as setCurrencySymbol }