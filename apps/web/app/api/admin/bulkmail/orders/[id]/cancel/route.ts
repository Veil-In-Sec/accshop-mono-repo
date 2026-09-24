import { requireAdmin } from "@/lib/server/admin";
import { cancelBulkMailOrder } from "@/lib/server/bulkmail";
import { db } from "@/lib/server/db";
import { getUsdToLocalRate, type FxRate } from "@/lib/server/fx";
import { jsonError } from "@/lib/server/auth";
import { routeError } from "@/lib/server/upstream";

async function withFx(): Promise<{ currency: string; fx: FxRate }> {
  const settings = await db.siteSetting.findUnique({ where: { id: 1 } });
  const currency = settings?.currencySymbol ?? "BDT";
  const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1;
  const fx = await getUsdToLocalRate(currency, manual, settings?.fxLiveEnabled ?? true);
  return { currency, fx };
}

/**
 * Cancels a pending supplier order. The refund lands in the BulkMail
 * wallet — the local customer order is deliberately untouched.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: raw } = await params;
    const id = Number(raw);
    if (!Number.isInteger(id)) return jsonError(400, "Invalid BulkMail order id.");

    const [result, { currency, fx }] = await Promise.all([
      cancelBulkMailOrder(id),
      withFx(),
    ]);
    return Response.json({
      success: true,
      message: result.message,
      refundedAmount: result.refundedAmount,
      refundedAmountBdt: Number((result.refundedAmount * fx.rate).toFixed(2)),
      currency,
    });
  } catch (e) {
    return routeError(e);
  }
}
