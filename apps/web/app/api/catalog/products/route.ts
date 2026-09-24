import { db } from "@/lib/server/db";
import { routeError } from "@/lib/server/upstream";

/** Active catalog products for the customer dashboard. No auth required. */
export async function GET() {
  try {
  const rows = await db.product.findMany({
    where: { active: true, section: "catalog" },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      price: true,
      originalPrice: true,
      stock: true,
      badge: true,
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return Response.json(
    rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      price: Number(p.price),
      originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
      stock: p.stock,
      badge: p.badge ?? undefined,
    })),
  );
  } catch (e) {
    return routeError(e);
  }
}