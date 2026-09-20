import { BadRequestException, Injectable } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.module"

@Injectable()
export class DepositsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Submits a deposit request for admin review. Does not credit the wallet immediately. */
  async submit(
    userId: string,
    input: {
      paymentMethodId: number
      amount: number
      senderAccountNumber?: string
      transactionReference: string
    },
  ) {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new BadRequestException("Enter an amount greater than zero.")
    }
    const MAX_DEPOSIT = 1_000_000
    if (input.amount > MAX_DEPOSIT) {
      throw new BadRequestException(`Maximum deposit is ${MAX_DEPOSIT.toFixed(2)}.`)
    }
    const reference = input.transactionReference?.trim() ?? ""
    if (!reference) {
      throw new BadRequestException("Enter the transaction reference from your payment.")
    }

    const settings = await this.prisma.siteSetting.findUnique({ where: { id: 1 } })
    const minDeposit = settings ? Number(settings.minDepositUsd) : 5
    if (input.amount < minDeposit) {
      throw new BadRequestException(`Minimum deposit is ${minDeposit.toFixed(2)}.`)
    }

    if (input.paymentMethodId != null) {
      const method = await this.prisma.paymentMethod.findUnique({
        where: { id: input.paymentMethodId },
      })
      if (!method || !method.enabled) {
        throw new BadRequestException("Selected payment method is not available.")
      }
    }

    // Prevent the same transaction reference being re-used to double-claim.
    const duplicate = await this.prisma.depositRequest.findFirst({
      where: { userId, transactionReference: reference },
      select: { id: true },
    })
    if (duplicate) {
      throw new BadRequestException("This transaction reference was already submitted.")
    }

    const created = await this.prisma.depositRequest.create({
      data: {
        userId,
        paymentMethodId: input.paymentMethodId,
        amount: input.amount.toFixed(2),
        senderAccountNumber: input.senderAccountNumber?.trim() || null,
        transactionReference: reference,
        status: "pending",
      },
    })

    return {
      success: true,
      message: "Deposit request submitted. It will be reviewed shortly.",
      id: created.id,
    }
  }

  /** The current user's own deposit request history. */
  async listMine(userId: string) {
    const rows = await this.prisma.depositRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })
    const methodIds = [...new Set(rows.map((r) => r.paymentMethodId).filter(Boolean))] as number[]
    const methods =
      methodIds.length > 0
        ? await this.prisma.paymentMethod.findMany({ where: { id: { in: methodIds } } })
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
  }

  async listAll(status?: string) {
    const allowed = ["pending", "approved", "rejected"]
    const rows = await this.prisma.depositRequest.findMany({
      where: status && allowed.includes(status) ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    const userIds = [...new Set(rows.map((r) => r.userId))]
    const users =
      userIds.length > 0 ? await this.prisma.user.findMany({ where: { id: { in: userIds } } }) : []
    const emailByUserId = new Map(users.map((u) => [u.id, u.email]))

    const methodIds = [...new Set(rows.map((r) => r.paymentMethodId).filter(Boolean))] as number[]
    const methods =
      methodIds.length > 0
        ? await this.prisma.paymentMethod.findMany({ where: { id: { in: methodIds } } })
        : []
    const nameById = new Map(methods.map((m) => [m.id, m.name]))

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userEmail: emailByUserId.get(r.userId) ?? r.userId,
      paymentMethodId: r.paymentMethodId,
      paymentMethod: r.paymentMethodId ? (nameById.get(r.paymentMethodId) ?? "") : "",
      amount: Number(r.amount),
      currency: r.currency,
      senderAccountNumber: r.senderAccountNumber ?? "",
      transactionReference: r.transactionReference ?? "",
      status: r.status,
      adminNote: r.adminNote ?? "",
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    }))
  }

  /** Approving credits the wallet. Atomic claim prevents double-credit races. */
  async review(id: number, decision: "approved" | "rejected", note?: string) {
    if (decision !== "approved" && decision !== "rejected") {
      throw new BadRequestException("Invalid decision.")
    }

    if (decision === "rejected") {
      const claimed = await this.prisma.depositRequest.updateMany({
        where: { id, status: "pending" },
        data: { status: decision, adminNote: note || null, reviewedAt: new Date() },
      })
      if (claimed.count === 0) {
        throw new BadRequestException("This request has already been reviewed.")
      }
      return { success: true, message: `Deposit ${decision}.` }
    }

    await this.prisma.$transaction(async (tx) => {
      // Atomically claim the request: only one concurrent reviewer wins.
      const claimed = await tx.depositRequest.updateMany({
        where: { id, status: "pending" },
        data: { status: "approved", adminNote: note || null, reviewedAt: new Date() },
      })
      if (claimed.count === 0) {
        throw new BadRequestException("This request has already been reviewed.")
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

    return { success: true, message: `Deposit ${decision}.` }
  }
}
