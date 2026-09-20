"use server"

import { cookies } from "next/headers"
import { serverFetch } from "@/lib/api/server"

const API_BASE = process.env.API_SERVER_URL ?? process.env.API_URL ?? "http://127.0.0.1:4000"

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
  try {
    return await serverFetch<{
      success: boolean
      message?: string
      delivered?: boolean
      balance?: number
      total?: number
      orderId?: number
      order?: { id: string; productName: string; status?: string }
    }>("/wallet/purchase", {
      method: "POST",
      body: JSON.stringify({ ...data, quantity: qty }),
    })
  } catch (error) {
    // serverFetch already throws ApiError with the API message — preserve it.
    if (error instanceof Error) throw error
    throw new Error("Purchase failed. Please try again.")
  }
}
