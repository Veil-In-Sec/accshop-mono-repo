"use server"

import { revalidatePath } from "next/cache"

import { serverApi } from "@/lib/api/endpoints"

export interface SubmitDepositInput {
  paymentMethodId: number
  amount: number
  senderAccountNumber?: string
  transactionReference: string
}

/** Customer: enabled payment methods + public settings (min deposit, currency). */
export async function getDepositPrereqs() {
  const [methods, settings] = await Promise.all([
    serverApi.payments.methodsEnabled(),
    serverApi.settings.getPublic(),
  ])
  return { methods, settings }
}

/** Customer: own deposit request history. */
export async function getMyDeposits() {
  try {
    return await serverApi.deposits.mine()
  } catch {
    return []
  }
}

/** Customer: submits a deposit request for admin review. Requires a session. */
export async function submitDepositAction(input: SubmitDepositInput) {
  try {
    const amount = Number(input.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false as const, message: "Enter an amount greater than zero." }
    }
    if (!input.paymentMethodId) {
      return { success: false as const, message: "Please select a payment method." }
    }
    if (!input.transactionReference?.trim()) {
      return { success: false as const, message: "Enter the transaction reference from your payment." }
    }
    const result = await serverApi.deposits.submit({
      paymentMethodId: Number(input.paymentMethodId),
      amount,
      senderAccountNumber: input.senderAccountNumber?.trim() || undefined,
      transactionReference: input.transactionReference.trim(),
    })
    revalidatePath("/dashboard/deposit")
    revalidatePath("/dashboard/transactions")
    return { success: true as const, message: result.message ?? "Deposit request submitted." }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit deposit."
    return { success: false as const, message }
  }
}

// --- Admin ---------------------------------------------------------------

/** Admin: lists deposit requests, optionally filtered by status. */
export async function listAllDeposits(status?: string) {
  try {
    return await serverApi.admin.deposits.list(status)
  } catch (error) {
    console.error("[admin] listAllDeposits failed:", error instanceof Error ? error.message : error)
    return []
  }
}

/** Admin: approves (credits wallet) or rejects a deposit request. */
export async function reviewDepositAction(
  id: number,
  decision: "approved" | "rejected",
  note?: string,
) {
  try {
    const result = await serverApi.admin.deposits.review(id, decision, note?.trim() || undefined)
    revalidatePath("/admin/deposits")
    revalidatePath("/admin")
    return { success: true as const, message: result.message ?? `Deposit ${decision}.` }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to review deposit."
    return { success: false as const, message }
  }
}

/** Admin: count of pending deposits for nav badge. */
export async function getPendingDepositsCount() {
  try {
    return await serverApi.admin.deposits.pendingCount()
  } catch {
    return { count: 0 }
  }
}
