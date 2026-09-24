import { db } from "@/lib/server/db";
import { routeError } from "@/lib/server/upstream";

/** Active category names for the customer dashboard. No auth required. */
export async function GET() {
  try {
  const rows = await db.category.findMany({
    where: { active: true },
    select: { name: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return Response.json(rows.map((r) => r.name));
  } catch (e) {
    return routeError(e);
  }
}