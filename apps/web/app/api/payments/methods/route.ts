import { db } from "@/lib/server/db";
import { routeError } from "@/lib/server/upstream";

/** Enabled payment methods for the deposit page. No auth required. */
export async function GET() {
  try {
  const rows = await db.paymentMethod.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: "asc" },
  });
  return Response.json(
    rows.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      accountNumber: m.accountNumber ?? "",
      accountName: m.accountName ?? "",
      instructions: m.instructions ?? "",
      icon: m.icon ?? "",
    })),
  );
  } catch (e) {
    return routeError(e);
  }
}