import { requireAdmin } from "@/lib/server/admin";
import { jsonError } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { isPrismaNotFound } from "@/lib/server/http";
import { routeError } from "@/lib/server/upstream";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isInteger(id)) throw jsonError(400, "Validation failed (numeric string is expected).");

  let row;
  try {
    row = await db.testimonial.delete({ where: { id } });
  } catch (error) {
    if (isPrismaNotFound(error)) throw jsonError(404, "Testimonial not found.");
    throw error;
  }
  await db.testimonial.updateMany({
    data: { sortOrder: { decrement: 1 } },
    where: { sortOrder: { gt: row.sortOrder } },
  });
  return Response.json({ success: true });
}