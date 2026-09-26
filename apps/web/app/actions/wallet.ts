"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/lib/server/db"
import { requireActionUser, actionErrorMessage } from "@/lib/server/action-context"
import { getOrCreateWallet, getWalletData as fetchWalletData, initializeAccount as seedAccount, transferBalance } from "@/lib/server/wallet"

/** Public site settings for deposit/currency display. No auth required. */
export async function getSiteSettings() {
  const settings = await db.siteSetting.findUnique({ where: { id: 1 } })
  return {
    currencySymbol: settings?.currencySymbol ?? "$",
    usdToLocalRate: settings ? Number(settings.usdToLocalRate) : 1,
    minDepositUsd: settings ? Number(settings.minDepositUsd) : 5,
    minTransferAmount: settings ? Number(settings.minTransferAmount) : 1,
    siteName: settings?.siteName ?? "AccShop",
    supportUrl: settings?.supportUrl ?? "https://t.me",
    heroTitle: settings?.heroTitle ?? "",
    heroSubtitle: settings?.heroSubtitle ?? "",
    footerText: settings?.footerText ?? "",
    heroBadge: settings?.heroBadge ?? "",
    aboutTitle: settings?.aboutTitle ?? "",
    aboutSubtitle: settings?.aboutSubtitle ?? "",
    aboutHeading: settings?.aboutHeading ?? "",
    aboutPara1: settings?.aboutPara1 ?? "",
    aboutPara2: settings?.aboutPara2 ?? "",
    stat1Value: settings?.stat1Value ?? "",
    stat1Label: settings?.stat1Label ?? "",
    stat2Value: settings?.stat2Value ?? "",
    stat2Label: settings?.stat2Label ?? "",
    stat3Value: settings?.stat3Value ?? "",
    stat3Label: settings?.stat3Label ?? "",
    stat4Value: settings?.stat4Value ?? "",
    stat4Label: settings?.stat4Label ?? "",
    trustTitle: settings?.trustTitle ?? "",
    trustDesc: settings?.trustDesc ?? "",
    trustBullets: settings?.trustBullets ?? "",
    valuesTitle: settings?.valuesTitle ?? "",
    valuesSubtitle: settings?.valuesSubtitle ?? "",
    featuresTitle: settings?.featuresTitle ?? "",
    featuresSubtitle: settings?.featuresSubtitle ?? "",
    teamTitle: settings?.teamTitle ?? "",
    teamDescription: settings?.teamDescription ?? "",
    teamStat1Value: settings?.teamStat1Value ?? "",
    teamStat1Label: settings?.teamStat1Label ?? "",
    teamStat2Value: settings?.teamStat2Value ?? "",
    teamStat2Label: settings?.teamStat2Label ?? "",
    teamImageUrl: settings?.teamImageUrl ?? "",
    testimonialsTitle: settings?.testimonialsTitle ?? "",
    testimonialsSubtitle: settings?.testimonialsSubtitle ?? "",
    faqTitle: settings?.faqTitle ?? "",
    ctaBadge: settings?.ctaBadge ?? "",
    ctaTitle: settings?.ctaTitle ?? "",
    ctaSubtitle: settings?.ctaSubtitle ?? "",
    contactPhone: settings?.contactPhone ?? "",
    contactSupportEmail: settings?.contactSupportEmail ?? "",
    contactSalesEmail: settings?.contactSalesEmail ?? "",
  }
}

/** Active catalog products for the customer dashboard. No auth required. */
export async function getCatalogProducts() {
  const rows = await db.product.findMany({
    where: { active: true, section: "catalog" },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      price: true,
      originalPrice: true,
      stock: true,
      badge: true,
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  })
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    price: Number(p.price),
    originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
    stock: p.stock,
    badge: p.badge ?? undefined,
  }))
}

/** Called once right after sign-up to seed the wallet. */
export async function initializeAccount() {
  const user = await requireActionUser()
  return seedAccount(user.id)
}

/** Balance + order history + transactions for the signed-in user. */
export async function getWalletData() {
  const user = await requireActionUser()
  return fetchWalletData(user.id)
}

/** Ensures the wallet exists and returns it. */
export async function getWallet() {
  const user = await requireActionUser()
  const wallet = await getOrCreateWallet(user.id)
  return { ...wallet, balance: Number(wallet.balance) }
}

/** Sends balance to another AccShop account by email. */
export async function transferBalanceAction(recipientEmail: string, amount: number) {
  try {
    const user = await requireActionUser()
    const email = typeof recipientEmail === "string" ? recipientEmail : ""
    const amt = Number(amount)
    if (
      !email ||
      email.length > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase())
    ) {
      return { success: false as const, message: "Enter a valid recipient email address." }
    }
    if (!Number.isFinite(amt) || amt <= 0 || amt > 1_000_000) {
      return { success: false as const, message: "Enter an amount greater than zero." }
    }
    const result = await transferBalance(user.id, email, amt)
    revalidatePath("/dashboard")
    return result
  } catch (e) {
    return { success: false as const, message: actionErrorMessage(e, "Transfer failed.") }
  }
}
