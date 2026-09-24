import { requireAdmin } from "@/lib/server/admin";
import { listBulkMailOrders } from "@/lib/server/bulkmail";
import { db } from "@/lib/server/db";
import { getUsdToLocalRate, type FxRate } from "@/lib/server/fx";
import { routeError } from "@/lib/server/upstream";

async function withFx(): Promise<{ currency: string; fx: FxRate }> {
  const settings = await db.siteSetting.findUnique({ where: { id: 1 } });
  const currency = settings?.currencySymbol ?? "BDT";
  const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1;
  const fx = await getUsdToLocalRate(currency, manual, settings?.fxLiveEnabled ?? true);
  return { currency, fx };
}

/** Supplier-side order list with BDT-converted totals. */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const params = new URL(req.url).searchParams;

    const pageRaw = Number(params.get("page") ?? "1");
    const perPageRaw = Number(params.get("perPage") ?? "20");
    const statusRaw = params.get("status") ?? undefined;
    const status = ["pending", "processing", "completed", "cancelled"].includes(statusRaw ?? "")
      ? statusRaw
      : undefined;

    const [list, { currency, fx }] = await Promise.all([
      listBulkMailOrders({
        page: Number.isFinite(pageRaw) ? pageRaw : 1,
        perPage: Number.isFinite(perPageRaw) ? perPageRaw : 20,
        status,
      }),
      withFx(),
    ]);
    const toBdt = (usd: number) => Number((usd * fx.rate).toFixed(2));
    return Response.json({
      items: list.items.map((o) => ({
        ...o,
        totalAmountBdt: toBdt(o.totalAmount),
        unitPriceBdt: toBdt(o.unitPrice),
      })),
      meta: list.meta,
      currency,
      rate: fx.rate,
      rateSource: fx.source,
    });
  } catch (e) {
    return routeError(e);
  }
}
