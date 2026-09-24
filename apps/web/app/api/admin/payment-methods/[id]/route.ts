import { requireAdmin } from "@/lib/server/admin";
import { jsonError } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { isPrismaNotFound } from "@/lib/server/http";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isInteger(id)) throw jsonError(400, "Validation failed (numeric string is expected).");

  const used = await db.depositRequest.count({ where: { paymentMethodId: id } });
  if (used > 0) {
    throw jsonError(
      400,
      "Cannot delete this payment method because deposit requests reference it. Disable it instead.",
    );
  }
  try {
    await db.paymentMethod.delete({ where: { id } });
  } catch (error) {
    if (isPrismaNotFound(error)) throw jsonError(404, "Payment method not found.");
    throw error;
  }
  return Response.json({ success: true });
}
