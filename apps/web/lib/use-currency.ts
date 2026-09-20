"use client"

import useSWR from "swr"
import { serverApi } from "@/lib/api/endpoints"

let cachedSymbol: string | null = null

export function useCurrencySymbol() {
  const { data, isLoading } = useSWR(
    "currency-symbol",
    async () => {
      if (cachedSymbol) return cachedSymbol
      const settings = await serverApi.settings.getPublic()
      cachedSymbol = settings?.currencySymbol ?? "BDT"
      return cachedSymbol
    },
    {
      fallbackData: "BDT",
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )

  return { currencySymbol: data ?? "BDT", isLoading }
}

export function clearCurrencySymbolCache() {
  cachedSymbol = null
}

export function setCurrencySymbol(symbol: string) {
  cachedSymbol = symbol
}