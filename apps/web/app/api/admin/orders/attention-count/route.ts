import { requireAdmin } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { routeError } from "@/lib/server/upstream";

export async function GET(req: Request) {
  try {
  await requireAdmin(req);
  const count = await db.order.count({
    where: { status: { in: ["pending", "processing"] } },
  });
  return Response.json({ count });
  } catch (e) {
    return routeError(e);
  }
}