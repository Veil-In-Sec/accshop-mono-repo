import { BadRequestException, Injectable } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.module"
import { Hotmail143Service, type HotmailAccount } from "../hotmail143/hotmail143.service"
import { BulkMailService } from "../bulkmail/bulkmail.service"
import { FxService } from "../fx/fx.service"
import { NotificationsService } from "../notifications/notifications.service"

export interface FulfilledOrder {
  orderId: number
  status: string
  accounts: HotmailAccount[]
  totalCost: number | null
  remainingBalance: number
}

/**
 * Single place that turns a paid order into delivered credentials.
 * Used by instant wallet checkout and by the admin retry endpoint, so new
 * suppliers or delivery channels only need to change this module.
 *
 * Routing: Product.supplier === "bulkmail" (+ bulkmailProductId) -> BulkMail,
 * otherwise Hotmail143 (externalProductType + externalAccountType).
 */
@Injectable()
export class FulfillmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hotmail143: Hotmail143Service,
    private readonly bulkmail: BulkMailService,
    private readonly fx: FxService,
    private readonly notifications: NotificationsService,
  ) {}

  async fulfill(orderId: number): Promise<FulfilledOrder> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } })
    if (!order) throw new BadRequestException("Order not found.")

    // Idempotency guard: never re-purchase from the supplier for an order
    // that is already completed. Retry is only allowed for
    // pending / processing / failed orders.
    const status = (order.status ?? "").toLowerCase()
    if (status === "completed") {
      throw new BadRequestException("Order is already completed.")
    }

    // Persist "processing" before calling the supplier so a crash between
    // the charge and the DB update leaves a reconcilable state instead of
    // a stuck "pending" order, and concurrent retries don't double-spend.
    if (status !== "processing") {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: "processing" },
      })
    }

    const product = order.productId
      ? await this.prisma.product.findUnique({ where: { id: order.productId } })
      : null
    if (!product) {
      throw new BadRequestException(
        "This product is no longer available. Contact support for a refund.",
      )
    }

    const supplier = ((product as { supplier?: string }).supplier ?? "hotmail143").toLowerCase()
    const bulkmailProductId = (product as { bulkmailProductId?: number | null })
      .bulkmailProductId
    const useBulkMail =
      supplier === "bulkmail" || (bulkmailProductId != null && !product.externalProductType)

    const qty = order.quantity ?? 1

    if (useBulkMail) {
      if (bulkmailProductId == null) {
        throw new BadRequestException(
          "This product is not mapped to a BulkMail product. Set the mapping in the product editor.",
        )
      }
      const result = await this.bulkmail.purchase(bulkmailProductId, qty)

      if (!result.accounts || result.accounts.length === 0) {
        throw new BadRequestException("BulkMail returned no accounts.")
      }

      // BulkMail charges in USD — store the cost converted to the store's
      // local currency (e.g. BDT): live internet rate when enabled, else the
      // locked flat value — so profit (sales − cost) stays consistent.
      const settings = await this.prisma.siteSetting.findUnique({ where: { id: 1 } })
      const currency = settings?.currencySymbol ?? "BDT"
      const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1
      const fx = await this.fx.getUsdToLocalRate(currency, manual, settings?.fxLiveEnabled ?? true)
      const rate = fx.rate
      const costLocal = Number(((result.totalCost ?? 0) * rate).toFixed(2))

      const first = result.accounts[0]
      const completed = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          deliveredEmail: first.email,
          deliveredPassword: first.password,
          deliveredRefreshToken: first.refresh_token ?? null,
          deliveredClientId: first.client_id ?? null,
          deliveredCredentials: JSON.stringify(result.accounts),
          actualCost: costLocal.toFixed(2),
          status: "completed",
          supplier: "bulkmail",
          // Numeric supplier order id — drives details / cancel / export calls.
          externalOrderId: String(result.orderId),
        },
      })

      try {
        await this.notifications.notify(
          order.userId,
          "order_completed",
          "Order delivered",
          `Your order #${order.id} (${order.productName}) is completed — credentials are ready in your dashboard.`,
        )
      } catch {
        // Notifications must never break a completed purchase.
      }

      return {
        orderId: completed.id,
        status: completed.status,
        accounts: result.accounts,
        totalCost: costLocal,
        remainingBalance: Number((result.remainingBalance * rate).toFixed(2)),
      }
    }

    if (!product.externalProductType || !product.externalAccountType) {
      throw new BadRequestException(
        "This product is not mapped to a supplier product type. Set the mapping in the product editor.",
      )
    }

    const result = await this.hotmail143.purchase(
      product.externalProductType,
      product.externalAccountType,
      qty,
    )

    if (!result.accounts || result.accounts.length === 0) {
      throw new BadRequestException("Hotmail143 returned no accounts.")
    }

    const first = result.accounts[0]
    const completed = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        deliveredEmail: first.email,
        deliveredPassword: first.password,
        deliveredRefreshToken: first.refresh_token ?? null,
        deliveredClientId: first.client_id ?? null,
        deliveredCredentials: JSON.stringify(result.accounts),
        actualCost: result.totalCost?.toFixed(2) ?? null,
        status: "completed",
        supplier: "hotmail143",
        externalOrderId: String(result.orderId),
      },
    })

    try {
      await this.notifications.notify(
        order.userId,
        "order_completed",
        "Order delivered",
        `Your order #${order.id} (${order.productName}) is completed — credentials are ready in your dashboard.`,
      )
    } catch {
      // Notifications must never break a completed purchase.
    }

    return {
      orderId: completed.id,
      status: completed.status,
      accounts: result.accounts,
      totalCost: result.totalCost ?? null,
      remainingBalance: result.remainingBalance,
    }
  }
}
