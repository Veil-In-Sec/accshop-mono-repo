import { requireAdmin } from "@/lib/server/admin";
import { getBulkMailOrder } from "@/lib/server/bulkmail";
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

/** Single supplier order with BDT-converted totals. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: raw } = await params;
    const id = Number(raw);
    if (!Number.isInteger(id)) return jsonError(400, "Invalid BulkMail order id.");

    const [order, { currency, fx }] = await Promise.all([getBulkMailOrder(id), withFx()]);
    const toBdt = (usd: number) => Number((usd * fx.rate).toFixed(2));
    return Response.json({
      ...order,
      totalAmountBdt: toBdt(order.totalAmount),
      unitPriceBdt: toBdt(order.unitPrice),
      currency,
      rate: fx.rate,
      rateSource: fx.source,
    });
  } catch (e) {
    return routeError(e);
  }
}
