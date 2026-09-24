import { requireAdmin } from "@/lib/server/admin";
import { jsonError } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { prismaError } from "@/lib/server/http";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id)) throw jsonError(400, "Invalid product id.");
  try {
    await db.product.delete({ where: { id } });
  } catch (error) {
    const mapped = prismaError(error);
    if (mapped) throw mapped;
    throw error;
  }
  return Response.json({ success: true });
}
