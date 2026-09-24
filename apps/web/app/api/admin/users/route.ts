import { requireAdmin } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { routeError } from "@/lib/server/upstream";

export async function GET(req: Request) {
  try {
  await requireAdmin(req);
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" } });
  const walletRows = await db.wallet.findMany();
  const balanceByUserId = new Map(walletRows.map((w) => [w.userId, Number(w.balance)]));

  return Response.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      balance: balanceByUserId.get(u.id) ?? 0,
      createdAt: u.createdAt.toISOString(),
    })),
  );
  } catch (e) {
    return routeError(e);
  }
}