import { requireAdmin } from "@/lib/server/admin";
import { listAllBulkMailCatalogProducts } from "@/lib/server/bulkmail";
import { db } from "@/lib/server/db";
import { getUsdToLocalRate } from "@/lib/server/fx";
import { routeError } from "@/lib/server/upstream";

/**
 * BulkMail catalog for the admin mapping browser. NOTE: the supplier ignores
 * the documented search/sort params, so we filter/sort/paginate locally over
 * the full cached catalog — search actually works here.
 */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const params = new URL(req.url).searchParams;

    const pageRaw = Number(params.get("page") ?? "1");
    const perPageRaw = Number(params.get("perPage") ?? "10");
    const search = params.get("search")?.trim() || undefined;
    const inStockRaw = params.get("inStock");
    const inStock =
      inStockRaw === "true" || inStockRaw === "1"
        ? true
        : inStockRaw === "false" || inStockRaw === "0"
          ? false
          : undefined;
    const sortRaw = params.get("sort") ?? undefined;
    const sort = ["name", "price", "stock_quantity", "created_at"].includes(sortRaw ?? "")
      ? sortRaw
      : undefined;
    const orderRaw = params.get("order") ?? undefined;
    const order = orderRaw === "asc" || orderRaw === "desc" ? orderRaw : undefined;

    const [all, settings] = await Promise.all([
      listAllBulkMailCatalogProducts(),
      db.siteSetting.findUnique({ where: { id: 1 } }),
    ]);
    const currency = settings?.currencySymbol ?? "BDT";
    const manual = settings ? Number(settings.usdToLocalRate) || 1 : 1;
    const fx = await getUsdToLocalRate(currency, manual, settings?.fxLiveEnabled ?? true);
    const toBdt = (usd: number) => Number((usd * fx.rate).toFixed(2));

    let items = all;
    if (inStock) {
      items = items.filter((c) => c.inStock && c.stock > 0);
    }
    const q = search?.toLowerCase();
    if (q) {
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.sku.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          String(c.productId) === q,
      );
    }
    const dir = order === "desc" ? -1 : 1;
    const sorted = [...items].sort((a, b) => {
      switch (sort) {
        case "price":
          return (a.price - b.price) * dir;
        case "stock_quantity":
          return (a.stock - b.stock) * dir;
        case "created_at":
          return (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0) * dir;
        default:
          return a.name.localeCompare(b.name) * dir;
      }
    });

    const perPage = Math.min(100, Math.max(1, Number.isFinite(perPageRaw) ? perPageRaw : 10));
    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
    const page = Number.isFinite(pageRaw) ? pageRaw : 1;
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const slice = sorted.slice((currentPage - 1) * perPage, currentPage * perPage);

    return Response.json({
      items: slice.map((c) => ({
        ...c,
        priceBdt: toBdt(c.price),
        basePriceBdt: toBdt(c.basePrice),
        bulkTiersBdt: c.bulkTiers.map((t) => ({
          min_quantity: t.min_quantity,
          price: t.price,
          priceBdt: toBdt(t.price),
        })),
      })),
      meta: {
        current_page: currentPage,
        per_page: perPage,
        total: sorted.length,
        total_pages: totalPages,
      },
      currency,
      rate: fx.rate,
      rateSource: fx.source,
    });
  } catch (e) {
    return routeError(e);
  }
}
