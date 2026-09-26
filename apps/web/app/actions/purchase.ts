"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/lib/server/db"
import { actionErrorMessage, requireActionUser } from "@/lib/server/action-context"
import { getOrCreateWallet, purchaseProduct } from "@/lib/server/wallet"

export async function purchaseOrder(data: {
  productId: number
  quantity?: number
  paymentMethodId?: number
  transactionReference?: string
  senderAccountNumber?: string
}) {
  if (!Number.isInteger(data.productId) || data.productId < 1) {
    throw new Error("Invalid product.")
  }
  const qty = data.quantity ?? 1
  if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
    throw new Error("Quantity must be between 1 and 100.")
  }
  const user = await requireActionUser()

  let productId = data.productId
  if (!Number.isInteger(productId) || productId < 1) {
    throw new Error("Invalid product.")
  }
  let qtyResolved: number | undefined
  if (qty !== undefined) {
    if (!Number.isInteger(qty) || qty < 1 || qty > 1000) {
      throw new Error("Quantity must be an integer between 1 and 1000.")
    }
    qtyResolved = qty
  }
  let paymentMethodId: number | undefined
  if (data.paymentMethodId !== undefined) {
    const n = Number(data.paymentMethodId)
    if (!Number.isInteger(n) || n < 1) {
      throw new Error("Invalid payment method.")
    }
    paymentMethodId = n
  }
  let transactionReference: string | undefined
  if (data.transactionReference !== undefined) {
    if (typeof data.transactionReference !== "string") {
      throw new Error("Invalid transaction reference.")
    }
    if (data.transactionReference.length > 200) {
      throw new Error("Transaction reference is too long.")
    }
    transactionReference = data.transactionReference
  }
  let senderAccountNumber: string | undefined
  if (data.senderAccountNumber !== undefined) {
    if (typeof data.senderAccountNumber !== "string") {
      throw new Error("Invalid sender account number.")
    }
    if (data.senderAccountNumber.length > 120) {
      throw new Error("Sender account number is too long.")
    }
    senderAccountNumber = data.senderAccountNumber
  }

  try {
    const result = await purchaseProduct(
      user.id,
      productId,
      paymentMethodId,
      transactionReference,
      qtyResolved,
      senderAccountNumber,
    )
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/orders")
    revalidatePath("/dashboard/transactions")
    return result
  } catch (e) {
    throw new Error(actionErrorMessage(e, "Purchase failed. Please try again."))
  }
}

/** Thin wrapper kept for pages that import ensure-wallet semantics. */
export async function ensureWallet() {
  const user = await requireActionUser()
  await getOrCreateWallet(user.id)
  return { success: true as const }
}
