import { requireAdmin } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { routeError } from "@/lib/server/upstream";

export async function GET(req: Request) {
  try {
  await requireAdmin(req);
  const searchParams = new URL(req.url).searchParams;
  const take = Math.min(500, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "200", 10) || 200));
  const skip = Math.max(0, Number.parseInt(searchParams.get("offset") ?? "0", 10) || 0);

  const rows = await db.order.findMany({
    orderBy: { purchasedAt: "desc" },
    take: Math.min(500, Math.max(1, take)),
    skip: Math.max(0, skip),
  });

  const userIds = [...new Set(rows.map((r) => r.userId))];
  const users =
    userIds.length > 0 ? await db.user.findMany({ where: { id: { in: userIds } } }) : [];
  const emailByUserId = new Map(users.map((u) => [u.id, u.email]));

  return Response.json(
    rows.map((o) => ({
      id: o.id,
      userEmail: emailByUserId.get(o.userId) ?? o.userId,
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
    })),
  );
  } catch (e) {
    return routeError(e);
  }
}