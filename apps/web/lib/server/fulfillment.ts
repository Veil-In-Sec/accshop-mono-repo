/**
 * Single place that turns a paid order into delivered credentials.
 * Port of apps/api/src/fulfillment/fulfillment.service.ts (FulfillmentService.fulfill).
 *
 * Routing: Product.supplier === "bulkmail" (+ bulkmailProductId) -> BulkMail,
 * otherwise Hotmail143 (externalProductType + externalAccountType).
 */

import { db } from "./db"
import { getUsdToLocalRate } from "./fx"
import { hotmailPurchase, type HotmailAccount } from "./hotmail143"
import { bulkmailPurchase } from "./bulkmail"
import { notify } from "./notifications"
import { badRequest } from "./upstream"

export interface FulfilledOrder {
  orderId: number
  status: string
  accounts: HotmailAccount[]
  totalCost: number | null
  remainingBalance: number
}

export async function fulfill(orderId: number): Promise<FulfilledOrder> {
  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order) badRequest("Order not found.")

  // Idempotency guard: never re-purchase from the supplier for an order
  // that is already completed. Retry is only allowed for
  // pending / processing / failed orders.
  const status = (order.status ?? "").toLowerCase()
  if (status === "completed") {
    badRequest("Order is already completed.")
  }

  // Persist "processing" before calling the supplier so a crash between
  // the charge and the DB update leaves a reconcilable state instead of
  // a stuck "pending" order, and concurrent retries don't double-spend.
  if (status !== "processing") {
    await db.order.update({
      where: { id: order.id },
      data: { status: "processing" },
    })
  }

  const product = order.productId
    ? await db.product.findUnique({ where: { id: order.productId } })
    : null
  if (!product) {
    badRequest("This product is no longer available. Contact support for a refund.")
  }

  const supplier = ((product as { supplier?: string }).supplier ?? "hotmail143").toLowerCase()
  const bulkmailProductId = (product as { bulkmailProductId?: number | null })
    .bulkmailProductId
  const useBulkMail =
    supplier === "bulkmail" || (bulkmailProductId != null && !product.externalProductType)

  const qty = order.quantity ?? 1

  if (useBulkMail) {
    if (bulkmailProductId == null) {
      badRequest(
        "This product is not mapped to a BulkMail product. Set the mapping in the product editor.",
      )
    }
    const result = await bulkmailPurchase(bulkmailProductId as number, qty)

    if (!result.accounts || result.accounts.length === 0) {
      badRequest("BulkMail returned no accounts.")
    }

    // BulkMail charges in USD — store the cost converted to the store's
    // local currency (e.g. BDT): live internet rate when enabled, else the
    // locked flat value — so profit (sales − cost) stays consistent.
    const settings = await db.siteSetting.findUnique({ where: { id: 1 } })
    const currency = settings?.currencySymbol ?? "BDT"
    const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1
    const fx = await getUsdToLocalRate(currency, manual, settings?.fxLiveEnabled ?? true)
    const rate = fx.rate
    const costLocal = Number(((result.totalCost ?? 0) * rate).toFixed(2))

    const first = result.accounts[0]
    const completed = await db.order.update({
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
      await notify(
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
    badRequest(
      "This product is not mapped to a supplier product type. Set the mapping in the product editor.",
    )
  }

  const result = await hotmailPurchase(
    product.externalProductType as string,
    product.externalAccountType as string,
    qty,
  )

  if (!result.accounts || result.accounts.length === 0) {
    badRequest("Hotmail143 returned no accounts.")
  }

  const first = result.accounts[0]
  const completed = await db.order.update({
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
    await notify(
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
