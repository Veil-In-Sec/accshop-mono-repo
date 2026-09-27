"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/lib/server/db"
import { actionErrorMessage, requireActionUser, requireActionAdmin } from "@/lib/server/action-context"

export interface SubmitDepositInput {
  paymentMethodId: number
  amount: number
  senderAccountNumber?: string
  transactionReference: string
}

/** Customer: enabled payment methods + public settings (min deposit, currency). */
export async function getDepositPrereqs() {
  const [methods, settings] = await Promise.all([
    db.paymentMethod.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.siteSetting.findUnique({ where: { id: 1 } }),
  ])
  return {
    methods: methods.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      accountNumber: m.accountNumber ?? "",
      accountName: m.accountName ?? "",
      instructions: m.instructions ?? "",
      icon: m.icon ?? "",
    })),
    settings: {
      currencySymbol: settings?.currencySymbol ?? "$",
      usdToLocalRate: settings ? Number(settings.usdToLocalRate) : 1,
      minDepositUsd: settings ? Number(settings.minDepositUsd) : 5,
      minTransferAmount: settings ? Number(settings.minTransferAmount) : 1,
      siteName: settings?.siteName ?? "AccShop",
      supportUrl: settings?.supportUrl ?? "https://t.me",
    },
  }
}

/** Customer: own deposit request history. */
export async function getMyDeposits() {
  try {
    const user = await requireActionUser()
    const rows = await db.depositRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    })
    const methodIds = [...new Set(rows.map((r) => r.paymentMethodId).filter(Boolean))] as number[]
    const methods =
      methodIds.length > 0
        ? await db.paymentMethod.findMany({ where: { id: { in: methodIds } } })
        : []
    const nameById = new Map(methods.map((m) => [m.id, m.name]))
    return rows.map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      currency: r.currency,
      status: r.status,
      paymentMethodId: r.paymentMethodId,
      paymentMethod: r.paymentMethodId ? (nameById.get(r.paymentMethodId) ?? "") : "",
      senderAccountNumber: r.senderAccountNumber ?? "",
      transactionReference: r.transactionReference ?? "",
      adminNote: r.adminNote ?? "",
      createdAt: r.createdAt.toISOString(),
    }))
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
    if (amount > 1_000_000) {
      return { success: false as const, message: `Maximum deposit is ${(1_000_000).toFixed(2)}.` }
    }
    if (!input.paymentMethodId) {
      return { success: false as const, message: "Please select a payment method." }
    }
    if (!input.senderAccountNumber?.trim()) {
      return { success: false as const, message: "Enter the account number you sent the payment from." }
    }
    if (input.senderAccountNumber.trim().length < 1 || input.senderAccountNumber.length > 120) {
      return { success: false as const, message: "Enter the account number you sent the payment from." }
    }
    if (!input.transactionReference?.trim()) {
      return { success: false as const, message: "Enter the transaction reference from your payment." }
    }
    if (input.transactionReference.trim().length < 1 || input.transactionReference.length > 200) {
      return { success: false as const, message: "Enter the transaction reference from your payment." }
    }
    const user = await requireActionUser()
    const reference = input.transactionReference.trim()

    const { getOrCreateWallet } = await import("@/lib/server/wallet")
    await getOrCreateWallet(user.id)

    const settings = await db.siteSetting.findUnique({ where: { id: 1 } })
    const minDeposit = settings ? Number(settings.minDepositUsd) : 5
    if (amount < minDeposit) {
      return { success: false as const, message: `Minimum deposit is ${minDeposit.toFixed(2)}.` }
    }

    const method = await db.paymentMethod.findUnique({ where: { id: Number(input.paymentMethodId) } })
    if (!method || !method.enabled) {
      return { success: false as const, message: "Selected payment method is not available." }
    }

    const duplicate = await db.depositRequest.findFirst({
      where: { userId: user.id, transactionReference: reference },
      select: { id: true },
    })
    if (duplicate) {
      return { success: false as const, message: "This transaction reference was already submitted." }
    }

    const created = await db.depositRequest.create({
      data: {
        userId: user.id,
        paymentMethodId: Number(input.paymentMethodId),
        amount: amount.toFixed(2),
        senderAccountNumber: input.senderAccountNumber?.trim() || null,
        transactionReference: reference,
        status: "pending",
      },
    })
    void created
    revalidatePath("/dashboard/deposit")
    revalidatePath("/dashboard/transactions")
    return { success: true as const, message: "Deposit request submitted. It will be reviewed shortly." }
  } catch (error) {
    return { success: false as const, message: actionErrorMessage(error, "Failed to submit deposit.") }
  }
}

// --- Admin ---------------------------------------------------------------

/** Admin: lists deposit requests, optionally filtered by status. */
export async function listAllDeposits(status?: string) {
  try {
    await requireActionAdmin()
    const allowed = ["pending", "approved", "rejected"]
    const rows = await db.depositRequest.findMany({
      where: status && allowed.includes(status) ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
    })
    const userIds = [...new Set(rows.map((r) => r.userId))]
    const methodIds = [...new Set(rows.map((r) => r.paymentMethodId).filter(Boolean))] as number[]
    const [users, methods] = await Promise.all([
      userIds.length > 0 ? await db.user.findMany({ where: { id: { in: userIds } } }) : [],
      methodIds.length > 0 ? await db.paymentMethod.findMany({ where: { id: { in: methodIds } } }) : [],
    ])
    const emailById = new Map(users.map((u) => [u.id, u.email]))
    const methodById = new Map(methods.map((m) => [m.id, m.name]))
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userEmail: emailById.get(r.userId) ?? r.userId,
      paymentMethodId: r.paymentMethodId,
      paymentMethod: r.paymentMethodId ? (methodById.get(r.paymentMethodId) ?? "") : "",
      amount: Number(r.amount),
      currency: r.currency,
      senderAccountNumber: r.senderAccountNumber ?? "",
      transactionReference: r.transactionReference ?? "",
      status: r.status,
      adminNote: r.adminNote ?? "",
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    }))
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
    await requireActionAdmin()
    if (!Number.isInteger(id)) throw new Error("Invalid deposit id.")
    if (decision !== "approved" && decision !== "rejected") throw new Error("Invalid decision.")
    if (note !== undefined && typeof note !== "string") throw new Error("Invalid note.")
    if (typeof note === "string" && note.length > 1000) throw new Error("Note is too long.")
    const adminNote = note?.trim() ? note.trim().slice(0, 1000) : null

    if (decision === "rejected") {
      const claimed = await db.depositRequest.updateMany({
        where: { id, status: "pending" },
        data: { status: decision, adminNote, reviewedAt: new Date() },
      })
      if (claimed.count === 0) throw new Error("This request has already been reviewed.")
    } else {
      await db.$transaction(async (tx) => {
        // Atomically claim the request: only one concurrent reviewer wins.
        const claimed = await tx.depositRequest.updateMany({
          where: { id, status: "pending" },
          data: { status: "approved", adminNote, reviewedAt: new Date() },
        })
        if (claimed.count === 0) {
          throw new Error("This request has already been reviewed.")
        }

        const request = await tx.depositRequest.findUniqueOrThrow({ where: { id } })

        // Atomic increment avoids lost-update races with concurrent
        // adjustments / approvals for the same user.
        const wallet = await tx.wallet.upsert({
          where: { userId: request.userId },
          create: { userId: request.userId, balance: Number(request.amount).toFixed(2) },
          update: { balance: { increment: Number(request.amount) }, updatedAt: new Date() },
        })

        await tx.transaction.create({
          data: {
            userId: request.userId,
            type: "deposit",
            description: "Wallet deposit approved",
            amount: Number(request.amount).toFixed(2),
            balanceAfter: Number(wallet.balance).toFixed(2),
            status: "completed",
          },
        })
      })
      try {
        const { notify } = await import("@/lib/server/notifications")
        const dep = await db.depositRequest.findUnique({ where: { id } })
        if (dep) {
          await notify(dep.userId, "deposit_approved", "Deposit approved", `Your deposit of ${Number(dep.amount).toFixed(2)} was approved and credited to your wallet.`)
        }
      } catch {
        /* ignore */
      }
    }
    revalidatePath("/admin/deposits")
    revalidatePath("/admin")
    return { success: true as const, message: `Deposit ${decision}.` }
  } catch (error) {
    return { success: false as const, message: actionErrorMessage(error, "Failed to review deposit.") }
  }
}

/** Admin: count of pending deposits for nav badge. */
export async function getPendingDepositsCount() {
  try {
    await requireActionAdmin()
    const count = await db.depositRequest.count({ where: { status: "pending" } })
    return { count }
  } catch {
    return { count: 0 }
  }
}
