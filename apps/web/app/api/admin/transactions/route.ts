import { requireAdmin } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { routeError } from "@/lib/server/upstream";

export async function GET(req: Request) {
  try {
  await requireAdmin(req);
  const type = new URL(req.url).searchParams.get("type") ?? undefined;

  const rows = await db.transaction.findMany({
    where: type ? { type } : undefined,
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const userIds = [...new Set(rows.map((r) => r.userId))];
  const users =
    userIds.length > 0 ? await db.user.findMany({ where: { id: { in: userIds } } }) : [];
  const emailByUserId = new Map(users.map((u) => [u.id, u.email]));

  return Response.json(
    rows.map((t) => ({
      id: t.id,
      userEmail: emailByUserId.get(t.userId) ?? t.userId,
      type: t.type,
      description: t.description ?? "",
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    })),
  );
  } catch (e) {
    return routeError(e);
  }
}