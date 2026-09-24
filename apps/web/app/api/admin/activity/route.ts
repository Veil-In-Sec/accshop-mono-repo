import { requireAdmin } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { routeError } from "@/lib/server/upstream";

export async function GET(req: Request) {
  try {
  await requireAdmin(req);
  const raw = new URL(req.url).searchParams.get("limit") ?? "";
  const parsed = Number.parseInt(raw, 10);
  const limit = Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 8;

  const [transactions, deposits] = await Promise.all([
    db.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, userId: true, type: true, amount: true, createdAt: true },
    }),
    db.depositRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, userId: true, amount: true, createdAt: true },
    }),
  ]);

  const userIds = [
    ...new Set([...transactions.map((t) => t.userId), ...deposits.map((d) => d.userId)]),
  ];
  const users =
    userIds.length > 0 ? await db.user.findMany({ where: { id: { in: userIds } } }) : [];
  const emailByUserId = new Map(users.map((u) => [u.id, u.email]));

  const events = [
    ...transactions.map((t) => ({
      kind: t.type,
      userEmail: emailByUserId.get(t.userId) ?? t.userId,
      amount: Number(t.amount),
      pending: false,
      createdAt: t.createdAt.toISOString(),
    })),
    ...deposits.map((d) => ({
      kind: "deposit_request",
      userEmail: emailByUserId.get(d.userId) ?? d.userId,
      amount: Number(d.amount),
      pending: true,
      createdAt: d.createdAt.toISOString(),
    })),
  ];

  events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Response.json(events.slice(0, limit));
  } catch (e) {
    return routeError(e);
  }
}