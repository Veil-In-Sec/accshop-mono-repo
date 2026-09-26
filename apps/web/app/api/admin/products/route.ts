import { Prisma } from "@prisma/client";

import { requireAdmin } from "@/lib/server/admin";
import { jsonError } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { prismaError, readJson } from "@/lib/server/http";
import { routeError } from "@/lib/server/upstream";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const section = new URL(req.url).searchParams.get("section") ?? undefined;
    if (section !== undefined && !section.trim()) {
      return Response.json(await listProducts(undefined));
    }
    return Response.json(await listProducts(section?.trim() || undefined));
  } catch (e) {
    return routeError(e);
  }
}

async function listProducts(section?: string) {
  const rows = await db.product.findMany({
    where: section ? { section } : undefined,
    orderBy: section ? [{ sortOrder: "asc" }] : [{ section: "asc" }, { sortOrder: "asc" }],
  });
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    section: p.section,
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
    stock: p.stock,
    tag: p.tag ?? "",
    badge: p.badge ?? "",
    active: p.active,
    featured: p.featured,
    externalProductType: p.externalProductType ?? "",
    externalAccountType: p.externalAccountType ?? "",
    supplier: p.supplier ?? "hotmail143",
    bulkmailProductId: p.bulkmailProductId ?? null,
  }));
}

function str(v: unknown, field: string, min: number, max: number, required: boolean): string | undefined {
  if (v === undefined || v === null) {
    if (required) throw jsonError(400, `${field} is required.`);
    return undefined;
  }
  if (typeof v !== "string" || v.length < min || v.length > max) {
    throw jsonError(400, `${field} must be a string of length ${min}-${max}.`);
  }
  if (required && v.length < 1) throw jsonError(400, `${field} is required.`);
  return v;
}

function num(v: unknown, field: string, min: number, max: number, required: boolean): number | undefined {
  if (v === undefined || v === null) {
    if (required) throw jsonError(400, `${field} is required.`);
    return undefined;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw jsonError(400, `${field} must be a number between ${min} and ${max}.`);
  }
  return n;
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await readJson<Record<string, unknown>>(req);

  // Manual UpsertProductDto validation -> 400.
  let id: number | undefined;
  if (body.id !== undefined && body.id !== null) {
    const n = Number(body.id);
    if (!Number.isInteger(n)) throw jsonError(400, "id must be an integer.");
    id = n;
  }
  const slug = str(body.slug, "slug", 1, 160, true)!;
  const name = str(body.name, "name", 1, 200, true)!;
  const category = str(body.category, "category", 1, 80, true)!;
  const section = str(body.section, "section", 1, 40, true)!;
  const price = num(body.price, "price", 0, 1_000_000, true)!;
  let originalPrice: number | null | undefined;
  if (body.originalPrice !== undefined && body.originalPrice !== null) {
    originalPrice = num(body.originalPrice, "originalPrice", 0, 1_000_000, false);
  } else {
    originalPrice = body.originalPrice === null ? null : undefined;
  }
  let stock: number;
  {
    const n = Number(body.stock);
    if (!Number.isInteger(n) || n < 0 || n > 1_000_000) {
      throw jsonError(400, "stock must be an integer between 0 and 1000000.");
    }
    stock = n;
  }
  const tag = body.tag === undefined || body.tag === null ? undefined : str(body.tag, "tag", 0, 100000, false);
  const badge = body.badge === undefined || body.badge === null ? undefined : str(body.badge, "badge", 0, 100000, false);
  if (typeof body.active !== "boolean") throw jsonError(400, "active must be a boolean.");
  if (typeof body.featured !== "boolean") throw jsonError(400, "featured must be a boolean.");
  const externalProductType =
    body.externalProductType === undefined || body.externalProductType === null
      ? undefined
      : str(body.externalProductType, "externalProductType", 0, 60, false);
  const externalAccountType =
    body.externalAccountType === undefined || body.externalAccountType === null
      ? undefined
      : str(body.externalAccountType, "externalAccountType", 0, 60, false);
  const supplierRaw =
    body.supplier === undefined || body.supplier === null ? undefined : str(body.supplier, "supplier", 0, 20, false);
  let bulkmailProductId: number | null | undefined;
  if (body.bulkmailProductId !== undefined && body.bulkmailProductId !== null) {
    const n = Number(body.bulkmailProductId);
    if (!Number.isInteger(n) || n < 1) throw jsonError(400, "bulkmailProductId must be an integer >= 1.");
    bulkmailProductId = n;
  } else {
    bulkmailProductId = body.bulkmailProductId === null ? null : undefined;
  }

  const externalProductTypeNorm = externalProductType?.trim() || null;
  const externalAccountTypeNorm = externalAccountType?.trim() || null;
  const allowedSuppliers = ["hotmail143", "bulkmail", "custom"];
  const supplier = (supplierRaw ?? "hotmail143").toLowerCase();
  if (!allowedSuppliers.includes(supplier)) {
    throw jsonError(400, "Invalid supplier. Use hotmail143, bulkmail, or custom.");
  }
  const bulkmailId =
    bulkmailProductId != null && Number.isInteger(Number(bulkmailProductId))
      ? Number(bulkmailProductId)
      : null;
  if (supplier === "bulkmail" && bulkmailId == null) {
    throw jsonError(400, "BulkMail products require a BulkMail product id.");
  }
  // Backward compat: legacy custom products carry supplier=hotmail143 with
  // empty mapping — coerce them to custom instead of rejecting the update.
  let effectiveSupplier = supplier;
  if (supplier === "hotmail143" && (!externalProductTypeNorm || !externalAccountTypeNorm)) {
    effectiveSupplier = "custom";
  }

  try {
    if (id) {
      await db.product.update({
        where: { id },
        data: {
          name,
          category,
          section,
          price: price.toFixed(2),
          originalPrice: originalPrice ? originalPrice.toFixed(2) : null,
          stock,
          tag: tag || null,
          badge: badge || null,
          active: body.active as boolean,
          featured: body.featured as boolean,
          externalProductType: externalProductTypeNorm,
          externalAccountType: externalAccountTypeNorm,
          supplier: effectiveSupplier,
          bulkmailProductId: bulkmailId,
          updatedAt: new Date(),
        },
      });
    } else {
      await db.product.create({
        data: {
          slug,
          name,
          category,
          section,
          price: price.toFixed(2),
          originalPrice: originalPrice ? originalPrice.toFixed(2) : null,
          stock,
          tag: tag || null,
          badge: badge || null,
          active: body.active as boolean,
          featured: body.featured as boolean,
          externalProductType: externalProductTypeNorm,
          externalAccountType: externalAccountTypeNorm,
          supplier: effectiveSupplier,
          bulkmailProductId: bulkmailId,
        },
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") throw jsonError(400, "A product with this slug already exists.");
      if (error.code === "P2025") throw jsonError(404, "Product not found.");
    }
    const mapped = prismaError(error);
    if (mapped) throw mapped;
    throw error;
  }

    return Response.json({ success: true });
  } catch (e) {
    return routeError(e);
  }
}
