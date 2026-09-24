import { requireAdmin } from "@/lib/server/admin";
import { jsonError } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { routeError } from "@/lib/server/upstream";

// NOTE (port difference): the NestJS AdminController has no GET
// admin/orders/:id endpoint. This detail handler is new — it returns a single
// order using the same row mapping as GET admin/orders so the admin UI can
// fetch one order by id.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id)) throw jsonError(400, "Invalid order id.");

  const o = await db.order.findUnique({ where: { id } });
  if (!o) throw jsonError(404, "Order not found.");

  const customer = await db.user.findUnique({ where: { id: o.userId } });

  return Response.json({
    id: o.id,
    userEmail: customer?.email ?? o.userId,
    productName: o.productName,
    price: Number(o.price),
    quantity: o.quantity,
    status: o.status,
    supplier: o.supplier ?? "hotmail143",
    externalOrderId: o.externalOrderId ?? "",
    purchasedAt: o.purchasedAt.toISOString(),
    deliveredEmail: o.deliveredEmail ?? "",
    deliveredPassword: o.deliveredPassword ?? "",
    deliveredRefreshToken: o.deliveredRefreshToken ?? "",
    deliveredClientId: o.deliveredClientId ?? "",
    deliveredCredentials: o.deliveredCredentials ?? "",
  });
}