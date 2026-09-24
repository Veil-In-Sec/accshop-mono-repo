import { requireAdmin } from "@/lib/server/admin";
import { jsonError } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { readJson } from "@/lib/server/http";
import { routeError } from "@/lib/server/upstream";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  const { id: raw } = await params;
  const userId = raw?.trim() ?? "";
  const body = await readJson<{ amount?: unknown; note?: unknown }>(req);

  // Manual AdjustBalanceDto validation -> 400.
  const amount = Number(body.amount);
  if (body.note !== undefined && body.note !== null) {
    if (typeof body.note !== "string" || body.note.length > 300) {
      throw jsonError(400, "note must be a string of at most 300 characters.");
    }
  }
  const note = typeof body.note === "string" ? body.note : undefined;

  if (!Number.isFinite(amount) || amount === 0) {
    throw jsonError(400, "Enter a non-zero adjustment amount.");
  }

  // NOTE (port difference): NestJS threw BadRequestException (400) for a
  // missing user here; preserved as 400 to keep admin UI behavior identical.
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw jsonError(400, "User not found.");

  const result = await db.$transaction(async (tx) => {
    // Ensure wallet exists, then apply an atomic increment so concurrent
    // adjustments / approvals cannot lose updates.
    await tx.wallet.upsert({
      where: { userId },
      create: { userId, balance: "0.00" },
      update: {},
    });

    const current = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    const nextBalance = Number((Number(current.balance) + amount).toFixed(2));
    if (nextBalance < 0) {
      throw jsonError(400, "Adjustment would make the balance negative.");
    }

    const updated = await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: amount }, updatedAt: new Date() },
    });

    await tx.transaction.create({
      data: {
        userId,
        type: "adjustment",
        description: note?.trim() || "Manual balance adjustment by admin",
        amount: amount.toFixed(2),
        balanceAfter: Number(updated.balance).toFixed(2),
        status: "completed",
      },
    });

    return Number(updated.balance);
  });

  return Response.json({ success: true, message: `Balance updated to $${result.toFixed(2)}.` });
}