import { requireAdmin } from "@/lib/server/admin";
import { jsonError } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { readJson } from "@/lib/server/http";
import { routeError } from "@/lib/server/upstream";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isInteger(id)) throw jsonError(400, "Validation failed (numeric string is expected).");

  const body = (await readJson(req)) as { direction?: unknown };
  if (body.direction !== "up" && body.direction !== "down") {
    throw jsonError(400, 'direction must be one of "up", "down".');
  }
  const direction = body.direction;

  const rows = await db.feature.findMany({ orderBy: { sortOrder: "asc" } });
  const index = rows.findIndex((r) => r.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= rows.length) return Response.json({ success: false });
  await db.$transaction([
    db.feature.update({ where: { id: rows[index].id }, data: { sortOrder: swapIndex } }),
    db.feature.update({ where: { id: rows[swapIndex].id }, data: { sortOrder: index } }),
  ]);
  return Response.json({ success: true });
}