import { requireAdmin } from "@/lib/server/admin";
import { jsonError } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { routeError } from "@/lib/server/upstream";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  const { id: raw } = await params;
  const userId = raw?.trim();
  if (!userId) throw jsonError(400, "User id is required.");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw jsonError(404, "User not found.");

  const [wallet, orders, transactions, deposits, supportRows, sessions, unreadNotifications, totpCount] =
    await Promise.all([
      db.wallet.findUnique({ where: { userId } }),
      db.order.findMany({
        where: { userId },
        orderBy: { purchasedAt: "desc" },
        take: 200,
      }),
      db.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      db.depositRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      db.supportMessage.findMany({
        where: { userId },
        orderBy: { id: "desc" },
        take: 20,
      }),
      db.session.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
      }),
      db.notification.count({ where: { userId, read: false } }),
      db.totpKey.count({ where: { userId } }),
    ]);

  const completedOrders = orders.filter(
    (o) => (o.status ?? "").toString().toLowerCase() === "completed",
  );
  const totalSpent = completedOrders.reduce(
    (sum, o) => sum + Number(o.price) * (o.quantity ?? 1),
    0,
  );
  const totalDeposited = transactions
    .filter((t) => t.type === "deposit" && t.status === "completed")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const pendingDeposits = deposits.filter((d) => d.status === "pending").length;
  const unreadSupport = await db.supportMessage.count({
    where: { userId, sender: "customer", read: false },
  });
  const lastSupport = supportRows[0] ?? null;

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    wallet: {
      balance: Number(wallet?.balance ?? 0),
      referralCode: wallet?.referralCode ?? null,
      referredBy: wallet?.referredBy ?? null,
      updatedAt: wallet?.updatedAt?.toISOString() ?? null,
    },
    stats: {
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      totalSpent: Number(totalSpent.toFixed(2)),
      totalDeposited: Number(totalDeposited.toFixed(2)),
      totalTransactions: transactions.length,
      pendingDeposits,
      unreadSupport,
      unreadNotifications,
      activeSessions: sessions.filter((s) => new Date(s.expiresAt) > new Date()).length,
      totpKeys: totpCount,
    },
    orders: orders.map((o) => ({
      id: o.id,
      productName: o.productName,
      price: Number(o.price),
      quantity: o.quantity,
      total: Number((Number(o.price) * (o.quantity ?? 1)).toFixed(2)),
      status: o.status,
      supplier: o.supplier ?? "hotmail143",
      externalOrderId: o.externalOrderId ?? "",
      purchasedAt: o.purchasedAt.toISOString(),
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      description: t.description ?? "",
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    })),
    deposits: deposits.map((d) => ({
      id: d.id,
      amount: Number(d.amount),
      currency: d.currency,
      paymentMethodId: d.paymentMethodId ?? null,
      senderAccountNumber: d.senderAccountNumber ?? "",
      transactionReference: d.transactionReference,
      status: d.status,
      adminNote: d.adminNote ?? "",
      createdAt: d.createdAt.toISOString(),
      reviewedAt: d.reviewedAt?.toISOString() ?? null,
    })),
    support: {
      total: await db.supportMessage.count({ where: { userId } }),
      unread: unreadSupport,
      lastText: lastSupport?.text ?? "",
      lastSender: lastSupport?.sender ?? "",
      lastAt: lastSupport?.createdAt.toISOString() ?? null,
      recent: [...supportRows].reverse().map((m) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        read: m.read,
        createdAt: m.createdAt.toISOString(),
      })),
    },
    sessions: sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress ?? "",
      userAgent: s.userAgent ?? "",
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      active: new Date(s.expiresAt) > new Date(),
    })),
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  const { id: raw } = await params;
  const userId = raw?.trim() ?? "";
  // NOTE (port difference): NestJS threw BadRequestException (400) for a
  // missing user here; preserved as 400 to keep admin UI behavior identical.
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw jsonError(400, "User not found.");

  await db.$transaction(async (tx) => {
    await tx.wallet.deleteMany({ where: { userId } });
    await tx.transaction.deleteMany({ where: { userId } });
    await tx.order.deleteMany({ where: { userId } });
    await tx.depositRequest.deleteMany({ where: { userId } });
    await tx.supportMessage.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });

  return Response.json({ success: true, message: "User deleted." });
}