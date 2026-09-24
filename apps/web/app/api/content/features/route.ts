import { db } from "@/lib/server/db";
import { routeError } from "@/lib/server/upstream";

export async function GET() {
  try {
  return Response.json(await db.feature.findMany({ orderBy: { sortOrder: "asc" } }));
  } catch (e) {
    return routeError(e);
  }
}