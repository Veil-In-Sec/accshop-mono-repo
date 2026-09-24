import { requireAdmin } from "@/lib/server/admin";
import { getBulkMailPricePreview } from "@/lib/server/bulkmail";
import { db } from "@/lib/server/db";
import { getUsdToLocalRate } from "@/lib/server/fx";
import { badRequest, routeError } from "@/lib/server/upstream";

/**
 * Catalog details + supplier totals at several quantities (bulk tiers
 * applied upstream), all converted to BDT — guides manual sell pricing.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: raw } = await params;
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) {
      badRequest("Invalid BulkMail product id.");
    }

    const [preview, settings] = await Promise.all([
      getBulkMailPricePreview(id),
      db.siteSetting.findUnique({ where: { id: 1 } }),
    ]);
    const currency = settings?.currencySymbol ?? "BDT";
    const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1;
    const fx = await getUsdToLocalRate(currency, manual);
    const toBdt = (usd: number) => Number((usd * fx.rate).toFixed(2));
    return Response.json({
      product: {
        ...preview.product,
        priceBdt: toBdt(preview.product.price),
        basePriceBdt: toBdt(preview.product.basePrice),
      },
      tiers: preview.product.bulkTiers.map((t) => ({
        min_quantity: t.min_quantity,
        price: t.price,
        priceBdt: toBdt(t.price),
      })),
      previews: preview.previews.map((p) => ({
        quantity: p.quantity,
        unitPrice: p.unit_price,
        totalPrice: p.total_price,
        unitPriceBdt: toBdt(p.unit_price),
        totalPriceBdt: toBdt(p.total_price),
        discountApplied: p.discount_applied,
        savings: p.savings,
        savingsBdt: toBdt(p.savings),
      })),
      currency,
      rate: fx.rate,
      rateSource: fx.source,
    });
  } catch (e) {
    return routeError(e);
  }
}
