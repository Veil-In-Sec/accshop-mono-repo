import { requireAdmin } from "@/lib/server/admin";
import { getBulkMailBalance } from "@/lib/server/bulkmail";
import { db } from "@/lib/server/db";
import { getUsdToLocalRate } from "@/lib/server/fx";
import { routeError } from "@/lib/server/upstream";

/** BulkMail wallet works in USD — return local (BDT) + raw USD + rate info. */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const [bal, settings] = await Promise.all([
      getBulkMailBalance(),
      db.siteSetting.findUnique({ where: { id: 1 } }),
    ]);
    const currency = settings?.currencySymbol ?? "BDT";
    const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1;
    const fx = await getUsdToLocalRate(currency, manual, settings?.fxLiveEnabled ?? true);
    const balanceUsd = Number(bal.balance ?? 0);
    return Response.json({
      balance: Number((balanceUsd * fx.rate).toFixed(2)),
      balanceUsd,
      currency,
      email: bal.email ?? "",
      rate: fx.rate,
      rateSource: fx.source,
      fetchedAt: fx.fetchedAt,
    });
  } catch (e) {
    return routeError(e);
  }
}
