import { BadRequestException, Injectable } from "@nestjs/common"
import { Prisma } from "@prisma/client"
import { randomInt } from "crypto"

import { PrismaService } from "../prisma/prisma.module"
import { FulfillmentService } from "../fulfillment/fulfillment.service"
import { NotificationsService } from "../notifications/notifications.service"

function randomSegment(length: number) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let out = ""
  for (let i = 0; i < length; i++) {
    out += chars[randomInt(chars.length)]
  }
  return out
}

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fulfillment: FulfillmentService,
    private readonly notifications: NotificationsService,
  ) {}

  private async getSettings() {
    return this.prisma.siteSetting.findUnique({ where: { id: 1 } })
  }

  private async createWallet(userId: string, referredBy: string | null, initialBalance: number): Promise<{ id: number; userId: string; balance: unknown } & Record<string, unknown>> {
    try {
      return await this.prisma.wallet.create({
        data: {
          userId,
          balance: initialBalance.toFixed(2),
          referralCode: randomSegment(6).toUpperCase(),
          referredBy,
        },
      })
    } catch (error) {
      // Another request created the wallet first (unique userId race).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const target = (error.meta?.target as string[] | undefined) ?? []
        // Only return the existing wallet when the collision was userId.
        // A referralCode collision must retry with a fresh code.
        if (target.includes("userId") || target.includes("user_id") || target.length === 0) {
          return this.prisma.wallet.findUniqueOrThrow({ where: { userId } })
        }
        return this.createWallet(userId, referredBy, initialBalance)
      }
      throw error
    }
  }

  async getOrCreateWallet(userId: string, referredBy?: string) {
    const existing = await this.prisma.wallet.findUnique({ where: { userId } })
    if (existing) return existing

    const settings = await this.getSettings()
    const initialBalance = settings ? Number(settings.initialBalance) : 0
    return this.createWallet(userId, referredBy ?? null, initialBalance)
  }

  /** Called once right after sign-up to seed the wallet. */
  async initializeAccount(userId: string) {
    await this.getOrCreateWallet(userId)
    return { success: true }
  }

  async getWalletData(userId: string) {
    const wallet = await this.getOrCreateWallet(userId)

    const orderRows = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { purchasedAt: "desc" },
    })
    const txnRows = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })

    return {
      balance: Number(wallet.balance),
      orders: orderRows.map((o) => ({
        id: String(o.id),
        productName: o.productName,
        tag: o.tag ?? undefined,
        price: Number(o.price),
        quantity: o.quantity,
        deliveredEmail: o.deliveredEmail ?? "",
        deliveredPassword: o.deliveredPassword ?? "",
        deliveredRefreshToken: o.deliveredRefreshToken ?? "",
        deliveredClientId: o.deliveredClientId ?? "",
        deliveredCredentials: o.deliveredCredentials ?? "",
        status: o.status,
        purchasedAt: o.purchasedAt.toISOString(),
      })),
      transactions: txnRows.map((t) => ({
        id: String(t.id),
        type: t.type as "deposit" | "purchase" | "refund" | "referral" | "transfer",
        description: t.description ?? "",
        amount: Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
        status: t.status as "completed" | "pending",
        createdAt: t.createdAt.toISOString(),
      })),
    }
  }

  /**
   * Buys a product directly with the customer's deposit balance.
   * The total is deducted first, then the order is fulfilled automatically
   * from Hotmail143 — there is no manual deliver step. If the supplier
   * call fails, the order is marked failed and the balance is refunded.
   */
  async purchaseProduct(
    userId: string,
    productId: number,
    paymentMethodId?: number,
    transactionReference?: string,
    quantity?: number,
    senderAccountNumber?: string,
  ) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } })
    if (!product) throw new BadRequestException("Product not found.")
    if (!product.active) throw new BadRequestException("This product is no longer available.")
    if (product.stock <= 0) throw new BadRequestException("This product is out of stock.")

    if (!Number.isInteger(quantity ?? 1) || (quantity ?? 1) < 1) {
      throw new BadRequestException("Quantity must be a positive integer.")
    }
    const qty = Math.min(1000, Math.floor(quantity ?? 1))
    if (qty > product.stock) throw new BadRequestException(`Only ${product.stock} left in stock.`)

    // Instant delivery requires a supplier mapping (Hotmail143 or BulkMail).
    // Fail fast BEFORE touching the balance so no money gets stuck.
    const supplier = (
      (product as { supplier?: string }).supplier ?? "hotmail143"
    ).toLowerCase()
    const bulkmailProductId = (product as { bulkmailProductId?: number | null })
      .bulkmailProductId
    const hasHotmailMapping = Boolean(product.externalProductType && product.externalAccountType)
    const hasBulkMailMapping = bulkmailProductId != null
    const useBulkMail = supplier === "bulkmail" || (hasBulkMailMapping && !hasHotmailMapping)
    if (!hasHotmailMapping && !hasBulkMailMapping) {
      throw new BadRequestException("This product is not available for instant delivery yet.")
    }

    const unitPrice = Number(product.price)
    const total = Number((unitPrice * qty).toFixed(2))

    // Ensure the buyer wallet exists before attempting the debit.
    await this.getOrCreateWallet(userId)

    const result = await this.prisma.$transaction(async (tx) => {
      // Atomically debit the wallet only if the deposit balance covers the total.
      const debit = await tx.wallet.updateMany({
        where: { userId, balance: { gte: total } },
        data: { balance: { decrement: total } },
      })
      if (debit.count === 0) {
        throw new BadRequestException(
          `Insufficient balance. This order costs ${total.toFixed(2)} — please deposit first.`,
        )
      }

      // Atomically reserve stock only if enough remains (prevents oversell races).
      const reserved = await tx.product.updateMany({
        where: { id: product.id, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      })
      if (reserved.count === 0) {
        throw new BadRequestException("This product just went out of stock.")
      }

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } })

      await tx.transaction.create({
        data: {
          userId,
          type: "purchase",
          description: `Purchased ${product.name} × ${qty}`,
          amount: (-total).toFixed(2),
          balanceAfter: Number(wallet.balance).toFixed(2),
          status: "completed",
        },
      })

      const order = await tx.order.create({
        data: {
          userId,
          productId: product.id,
          productName: product.name,
          tag: product.tag,
          price: product.price,
          quantity: qty,
          status: "processing",
          supplier: useBulkMail ? "bulkmail" : "hotmail143",
          paymentMethodId: paymentMethodId ?? null,
          transactionReference: transactionReference?.trim() || null,
          senderAccountNumber: senderAccountNumber || null,
        },
      })

      return { order, balance: Number(wallet.balance) }
    })

    // Auto-fulfill from the supplier OUTSIDE the DB transaction (external HTTP call).
    try {
      const fulfilled = await this.fulfillment.fulfill(result.order.id)

      return {
        success: true,
        message: "Payment successful — your credentials were delivered instantly.",
        delivered: true,
        balance: result.balance,
        total,
        order: {
          id: String(result.order.id),
          productName: result.order.productName,
          tag: result.order.tag ?? undefined,
          price: Number(result.order.price),
          quantity: result.order.quantity,
          status: fulfilled.status,
          purchasedAt: result.order.purchasedAt.toISOString(),
        },
      }
    } catch (error) {
      // Supplier failed: mark the order failed, release stock, refund atomically.
      // If the supplier did create an order (charged supplier wallet), its id
      // rides on the error — stamp it so admin can correlate/re-export/retry.
      const supplierOrderId =
        error && typeof error === "object" && "supplierOrderId" in error
          ? (error as { supplierOrderId?: unknown }).supplierOrderId
          : undefined
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.wallet.updateMany({
          where: { userId },
          data: { balance: { increment: total }, updatedAt: new Date() },
        })
        if (updated.count === 0) {
          throw new BadRequestException("Wallet not found for refund.")
        }
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } })
        const nextBalance = Number(wallet.balance)

        await tx.transaction.create({
          data: {
            userId,
            type: "refund",
            description: `Refund for failed order #${result.order.id} (${product.name})`,
            amount: total.toFixed(2),
            balanceAfter: nextBalance.toFixed(2),
            status: "completed",
          },
        })

        await tx.order.update({
          where: { id: result.order.id },
          data: {
            status: "failed",
            ...(typeof supplierOrderId === "number" && supplierOrderId > 0
              ? { externalOrderId: String(supplierOrderId) }
              : {}),
          },
        })

        await tx.product.update({
          where: { id: product.id },
          data: { stock: { increment: qty } },
        })
      })

      try {
        await this.notifications.notify(
          userId,
          "info",
          "Order failed — balance refunded",
          `Order #${result.order.id} (${product.name}) could not be fulfilled, so ${total.toFixed(2)} was refunded to your wallet.`,
        )
      } catch {
        /* ignore */
      }

      const reason =
        error instanceof BadRequestException ? error.message : "Supplier fulfillment failed."
      throw new BadRequestException(`${reason} Your balance was refunded.`)
    }
  }

  async transferBalance(userId: string, recipientEmail: string, amount: number) {
    const email = recipientEmail.trim().toLowerCase()
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(email)) {
      throw new BadRequestException("Enter a valid recipient email address.")
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("Enter an amount greater than zero.")
    }

    const settings = await this.getSettings()
    const minTransfer = settings ? Number(settings.minTransferAmount) : 1
    if (amount < minTransfer) {
      throw new BadRequestException(`Minimum transfer amount is ${minTransfer.toFixed(2)}.`)
    }

    const sender = await this.prisma.user.findUnique({ where: { id: userId } })
    if (sender && sender.email.toLowerCase() === email) {
      throw new BadRequestException("You cannot transfer balance to yourself.")
    }

    const recipientUser = await this.prisma.user.findUnique({ where: { email } })
    if (!recipientUser) {
      throw new BadRequestException("No AccShop account found with that email.")
    }

    // Ensure the sender wallet exists before attempting the transfer.
    await this.getOrCreateWallet(userId)

    await this.prisma.$transaction(async (tx) => {
      // Atomically debit the sender only if the balance covers the amount.
      const debit = await tx.wallet.updateMany({
        where: { userId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      })
      if (debit.count === 0) {
        throw new BadRequestException("Insufficient balance for this transfer.")
      }

      const senderWallet = await tx.wallet.findUniqueOrThrow({ where: { userId } })
      await tx.transaction.create({
        data: {
          userId,
          type: "transfer",
          description: `Transferred to ${email}`,
          amount: (-amount).toFixed(2),
          balanceAfter: Number(senderWallet.balance).toFixed(2),
          status: "completed",
        },
      })

      const recipientWallet = await tx.wallet.upsert({
        where: { userId: recipientUser.id },
        create: {
          userId: recipientUser.id,
          balance: amount.toFixed(2),
          referralCode: randomSegment(6).toUpperCase(),
        },
        update: { balance: { increment: amount } },
      })
      await tx.transaction.create({
        data: {
          userId: recipientUser.id,
          type: "transfer",
          description: `Received from ${sender?.email ?? "another user"}`,
          amount: amount.toFixed(2),
          balanceAfter: Number(recipientWallet.balance).toFixed(2),
          status: "completed",
        },
      })
    })

    return { success: true, message: `Sent ${amount.toFixed(2)} to ${email}.` }
  }
}
