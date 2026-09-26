import { requireAdmin } from "@/lib/server/admin";
import { jsonError } from "@/lib/server/auth";
import { readJson } from "@/lib/server/http";
import { routeError } from "@/lib/server/upstream";
import { db } from "@/lib/server/db";
import { notify } from "@/lib/server/notifications";
import type { Order } from "@prisma/client";

interface CredentialItem {
  email: string;
  password: string;
  refresh_token?: string;
  client_id?: string;
}

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

    const body = await readJson<{
      credentials: CredentialItem[];
    }>(req);

    if (!body.credentials || !Array.isArray(body.credentials) || body.credentials.length === 0) {
      return jsonError(400, "At least one credential is required.");
    }

    // Validate each credential has email and password
    for (const cred of body.credentials) {
      if (!cred.email || !cred.password) {
        return jsonError(400, "Each credential must have email and password.");
      }
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

    if (order.status === "completed" && order.deliveredCredentials) {
      return jsonError(400, "This order has already been delivered.");
    }

    // Update the order with delivered credentials
    const firstCred = body.credentials[0];
    await db.order.update({
      where: { id: orderId },
      data: {
        status: "completed",
        deliveredEmail: firstCred.email,
        deliveredPassword: firstCred.password,
        deliveredRefreshToken: firstCred.refresh_token ?? null,
        deliveredClientId: firstCred.client_id ?? null,
        deliveredCredentials: JSON.stringify(body.credentials),
        supplier: "custom",
      },
    });

    // Notify the customer
    try {
      await notify(
        order.userId,
        "order_completed",
        "Custom Product Delivered",
        `Your custom product for order #${orderId} (${order.productName}) has been delivered. Check your dashboard for credentials.`
      );
    } catch {
      // Ignore notification errors
    }

    return Response.json({
      success: true,
      message: `Custom product delivered successfully with ${body.credentials.length} account(s).`,
    });
  } catch (e) {
    return routeError(e);
  }
}