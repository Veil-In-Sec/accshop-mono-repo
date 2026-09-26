import { requireAdmin } from "@/lib/server/admin";
import { jsonError } from "@/lib/server/auth";
import { routeError } from "@/lib/server/upstream";
import { db } from "@/lib/server/db";
import { notify } from "@/lib/server/notifications";
import type { Order } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id: raw } = await params;
    const orderId = Number(raw);
    if (!Number.isInteger(orderId)) {
      return jsonError(400, "Invalid order ID.");
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        product: true,
      },
    }) as (Order & { product: { name: string } | null }) | null;

    if (!order) {
      return jsonError(404, "Order not found.");
    }

    if (order.supplier !== "custom") {
      return jsonError(400, "This order is not a custom product.");
    }

    if (order.status !== "processing") {
      return jsonError(400, "Only processing orders can be rejected.");
    }

    const unitPrice = Number(order.price)
    const qty = order.quantity ?? 1
    const total = Number((unitPrice * qty).toFixed(2))

    // Refund the customer and mark order as failed
    await db.$transaction(async (tx) => {
      // Refund wallet balance
      const updated = await tx.wallet.updateMany({
        where: { userId: order.userId },
        data: { balance: { increment: total }, updatedAt: new Date() },
      })
      if (updated.count === 0) {
        throw new Error("Wallet not found for refund.")
      }
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: order.userId } })
      const nextBalance = Number(wallet.balance)

      // Create refund transaction
      await tx.transaction.create({
        data: {
          userId: order.userId,
          type: "refund",
          description: `Refund for rejected custom order #${order.id} (${order.productName})`,
          amount: total.toFixed(2),
          balanceAfter: nextBalance.toFixed(2),
          status: "completed",
        },
      })

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "failed",
        },
      })

      // Restore product stock
      if (order.productId) {
        await tx.product.update({
          where: { id: order.productId },
          data: { stock: { increment: qty } },
        })
      }
    })

    // Notify the customer
    try {
      await notify(
        order.userId,
        "info",
        "Custom Order Rejected — Refunded",
        `Your custom order #${orderId} (${order.productName}) was rejected. ${total.toFixed(2)} has been refunded to your wallet.`
      );
    } catch {
      // Ignore notification errors
    }

    return Response.json({
      success: true,
      message: `Custom order rejected and ${total.toFixed(2)} refunded to customer.`,
    });
  } catch (e) {
    return routeError(e);
  }
}