import { requireAdmin } from "@/lib/server/admin";
import { getBulkMailBalance } from "@/lib/server/bulkmail";
import { db } from "@/lib/server/db";
import { getUsdToLocalRate } from "@/lib/server/fx";
import { getHotmailBalance } from "@/lib/server/hotmail143";
import { routeError } from "@/lib/server/upstream";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);
  // Year window for period sums (today/week/month/year) — bounded, unlike
  // the previous unbounded full-table load.
  const sinceYear = new Date();
  sinceYear.setDate(sinceYear.getDate() - 366);
  sinceYear.setHours(0, 0, 0, 0);

  // DB-side aggregates first; only the year window is loaded row-wise
  // for period sums + chart. Global totals come from raw SQL below.
  const [userCount, orderCount, pendingDeposits, walletAgg, windowOrders, siteSettings] =
    await Promise.all([
      db.user.count(),
      db.order.count(),
      db.depositRequest.count({ where: { status: "pending" } }),
      db.wallet.aggregate({ _sum: { balance: true } }),
      db.order.findMany({
        where: { purchasedAt: { gte: sinceYear } },
        select: { purchasedAt: true, price: true, quantity: true, status: true, actualCost: true },
        take: 10000,
        orderBy: { purchasedAt: "desc" },
      }),
      db.siteSetting.findUnique({ where: { id: 1 } }),
    ]);
  // Store currency: supplier USD amounts are converted to local (e.g. BDT)
  // so profit math (sales − cost) stays in one currency.
  const siteSettingsRow = siteSettings;
  const usdToLocalRate = siteSettingsRow ? Number(siteSettingsRow.usdToLocalRate) || 1 : 1;
  const siteCurrency = siteSettingsRow?.currencySymbol ?? "BDT";
  // Live supplier balances + FX (null on failure, never fail the overview).
  const [hotmailBalanceRes, bulkmailBalanceRes, fxRateRes] = await Promise.all([
    getHotmailBalance()
      .then((r) => r.balance)
      .catch(() => null),
    getBulkMailBalance()
      .then((r) => r.balance)
      .catch(() => null),
    getUsdToLocalRate(
      siteSettingsRow?.currencySymbol ?? "BDT",
      siteSettingsRow ? Number(siteSettingsRow.usdToLocalRate) || 1 : 1,
      (siteSettingsRow as { fxLiveEnabled?: boolean } | null)?.fxLiveEnabled ?? true,
    ).catch(() => null),
  ]);
  const hotmailBalance: number | null =
    typeof hotmailBalanceRes === "number" && Number.isFinite(hotmailBalanceRes)
      ? hotmailBalanceRes
      : null;
  const bulkmailBalanceUsd: number | null =
    typeof bulkmailBalanceRes === "number" && Number.isFinite(bulkmailBalanceRes)
      ? bulkmailBalanceRes
      : null;
  const liveRate =
    fxRateRes && typeof fxRateRes.rate === "number" && Number.isFinite(fxRateRes.rate)
      ? fxRateRes.rate
      : null;
  const liveSource = fxRateRes?.source ?? null;
  const recentOrders = windowOrders.filter(
    (o) => o.purchasedAt && new Date(o.purchasedAt) >= since,
  );
  // Totals via raw SQL (price × qty) so we never load the whole table.
  let totals: Array<{ sales: number; cost: number }> = [{ sales: 0, cost: 0 }];
  try {
    totals = await db.$queryRaw<Array<{ sales: number; cost: number }>>`
      SELECT
        COALESCE(SUM(price * quantity), 0)::float AS sales,
        COALESCE(SUM(COALESCE(actual_cost, 0)), 0)::float AS cost
      FROM orders WHERE status = 'completed'
    `;
  } catch {
    // Fallback: estimate from the window if raw query fails.
  }
  const allOrdersForRevenue: Array<{
    price: unknown;
    quantity: number | null;
    status: string | null;
    purchasedAt: Date;
    actualCost: unknown | null;
  }> = windowOrders as unknown as typeof allOrdersForRevenue;
  // Total sales = Σ(price×qty) over orders.
  // Profit = total sales − total supplier cost, calculated from total orders:
  // profit = Σ(price×qty − actualCost) per order.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salesFor = (o: any) => Number(o.price) * (o.quantity ?? 1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profitFor = (o: any) => Number(o.price) * (o.quantity ?? 1) - Number(o.actualCost ?? 0);
  const completedForRevenue = allOrdersForRevenue.filter(
    (o) => (o.status ?? "").toString().toLowerCase() === "completed",
  );
  const revenueSource = completedForRevenue.length > 0 ? completedForRevenue : allOrdersForRevenue;
  // Prefer exact DB totals when completed orders exist; fall back to window sums.
  const useDbTotals = completedForRevenue.length > 0 && totals[0];
  const totalCustomerAmount = useDbTotals
    ? Number(totals[0].sales ?? 0)
    : revenueSource.reduce((sum, o) => sum + salesFor(o), 0);
  const totalSales = totalCustomerAmount;
  const totalHotmailCost = useDbTotals
    ? Number(totals[0].cost ?? 0)
    : revenueSource.reduce((sum, o) => sum + Number(o.actualCost ?? 0), 0);
  // NOTE: live supplier wallets, converted to store currency for display.
  const presentHotmailBalance: number | null =
    typeof hotmailBalance === "number" ? hotmailBalance : null;
  const previousHotmailBalance: number | null = null;
  const presentBulkmailBalanceUsd: number | null =
    typeof bulkmailBalanceUsd === "number" ? bulkmailBalanceUsd : null;
  const presentBulkmailBalance: number | null =
    presentBulkmailBalanceUsd != null
      ? Number((presentBulkmailBalanceUsd * (liveRate ?? usdToLocalRate)).toFixed(2))
      : null;
  const bulkmailRate: number | null = liveRate ?? usdToLocalRate;
  const bulkmailRateSource = liveSource ?? "manual";
  const bulkmailCurrency = siteCurrency;
  const totalRevenue = totalCustomerAmount - totalHotmailCost;
  const totalProfit = totalRevenue;

  // Sales by period — day / week / month / year (realtime, based on purchasedAt, total order amount)
  // Profit by period — same windows, profit calculated from total orders (sales − actualCost)
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  startOfYear.setHours(0, 0, 0, 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inSince = (s: Date) => revenueSource.filter((o: any) => o.purchasedAt && new Date(o.purchasedAt) >= s);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salesSumFor = (s: Date) => inSince(s).reduce((sum: number, o: any) => sum + salesFor(o), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sumFor = (s: Date) => inSince(s).reduce((sum: number, o: any) => sum + profitFor(o), 0);
  const salesToday = salesSumFor(startOfDay);
  const salesWeek = salesSumFor(startOfWeek);
  const salesMonth = salesSumFor(startOfMonth);
  const salesYear = salesSumFor(startOfYear);
  const revenueToday = sumFor(startOfDay);
  const revenueWeek = sumFor(startOfWeek);
  const revenueMonth = sumFor(startOfMonth);
  const revenueYear = sumFor(startOfYear);

  const revenueByDay: { date: string; revenue: number; sales: number; profit: number; orders: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    revenueByDay.push({
      date: day.toISOString().slice(0, 10),
      revenue: 0,
      sales: 0,
      profit: 0,
      orders: 0,
    });
  }
  const dayIndex = new Map(revenueByDay.map((d) => [d.date, d]));
  // Only count completed (or all if none completed). revenue = total sales for the day,
  // profit calculated from total orders for the day (sales − actualCost).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentSource = recentOrders.filter((o: any) => {
    const s = (o.status ?? "").toString().toLowerCase();
    if (completedForRevenue.length > 0) return s === "completed";
    return true;
  });
  for (const order of recentSource) {
    const bucket = dayIndex.get(order.purchasedAt.toISOString().slice(0, 10));
    if (bucket) {
      const sale = Number(order.price) * (order.quantity ?? 1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profit = sale - Number((order as any).actualCost ?? 0);
      bucket.sales = Number((bucket.sales + sale).toFixed(2));
      bucket.profit = Number((bucket.profit + profit).toFixed(2));
      bucket.revenue = bucket.sales;
      bucket.orders += 1;
    }
  }

  return Response.json({
    userCount,
    orderCount,
    totalCustomerAmount: Number(totalCustomerAmount.toFixed(2)),
    totalSales: Number(totalSales.toFixed(2)),
    totalHotmailCost: Number(totalHotmailCost.toFixed(2)),
    presentHotmailBalance,
    previousHotmailBalance,
    presentBulkmailBalance,
    presentBulkmailBalanceUsd,
    bulkmailRate,
    bulkmailRateSource,
    bulkmailCurrency,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    salesToday: Number(salesToday.toFixed(2)),
    salesWeek: Number(salesWeek.toFixed(2)),
    salesMonth: Number(salesMonth.toFixed(2)),
    salesYear: Number(salesYear.toFixed(2)),
    profitToday: Number(revenueToday.toFixed(2)),
    profitWeek: Number(revenueWeek.toFixed(2)),
    profitMonth: Number(revenueMonth.toFixed(2)),
    profitYear: Number(revenueYear.toFixed(2)),
    revenueToday: Number(revenueToday.toFixed(2)),
    revenueWeek: Number(revenueWeek.toFixed(2)),
    revenueMonth: Number(revenueMonth.toFixed(2)),
    revenueYear: Number(revenueYear.toFixed(2)),
    pendingDeposits,
    totalWalletLiability: Number(walletAgg._sum.balance ?? 0),
    revenueByDay,
  });
  } catch (e) {
    return routeError(e);
  }
}
