import { requireAdmin } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { getUsdToLocalRate } from "@/lib/server/fx";
import { routeError } from "@/lib/server/upstream";

/** Effective USD → local rate (live internet rate, flat value, or manual fallback). */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const settings = await db.siteSetting.findUnique({ where: { id: 1 } });
    const currency = settings?.currencySymbol ?? "BDT";
    const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1;
    const liveEnabled = settings?.fxLiveEnabled ?? true;
    const fx = await getUsdToLocalRate(currency, manual, liveEnabled);
    return Response.json({
      rate: fx.rate,
      source: fx.source,
      liveEnabled,
      currency,
      fetchedAt: fx.fetchedAt,
      manualRate: manual,
    });
  } catch (e) {
    return routeError(e);
  }
}
