"use server"

import { serverApi } from "@/lib/api/endpoints"

/** Public site settings for deposit/currency display. No auth required. */
export async function getSiteSettings() {
  return serverApi.settings.getPublic()
}

/** Active catalog products for the customer dashboard. No auth required. */
export async function getCatalogProducts() {
  return serverApi.catalog.products()
}

/** Called once right after sign-up to seed the wallet. */
export async function initializeAccount() {
  return serverApi.wallet.init()
}

/** Balance + order history + transactions for the signed-in user. */
export async function getWalletData() {
  return serverApi.wallet.getData()
}
