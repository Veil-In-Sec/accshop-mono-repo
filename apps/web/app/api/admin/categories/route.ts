import { Prisma } from "@prisma/client";

import { requireAdmin } from "@/lib/server/admin";
import { jsonError } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { readJson } from "@/lib/server/http";
import { routeError } from "@/lib/server/upstream";

export async function GET(req: Request) {
  try {
  await requireAdmin(req);
  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return Response.json(
    rows.map((c) => ({
      id: c.id,
      name: c.name,
      active: c.active,
      isCustom: c.isCustom,
    })),
  );
  } catch (e) {
    return routeError(e);
  }
}

function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function uniqueCategorySlug(name: string, excludeId?: number): Promise<string> {
  const base = slugifyCategory(name) || "cat";
  let candidate = base;
  let n = 1;
  for (;;) {
    const found = await db.category.findFirst({
      where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (!found) return candidate;
    candidate = `${base}-${n++}`;
  }
}

export async function POST(req: Request) {
  try {
  await requireAdmin(req);
  const body = await readJson<{ name?: unknown }>(req);
  // Manual CreateCategoryDto validation -> 400.
  if (typeof body.name !== "string" || body.name.trim().length < 1 || body.name.length > 60) {
    throw jsonError(400, "name must be a string of length 1-60.");
  }
  const trimmed = body.name.trim();
  if (!trimmed) throw jsonError(400, "Category name is required.");
  const clash = await db.category.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (clash) throw jsonError(400, "A category with this name already exists.");

  const max = await db.category.aggregate({ _max: { sortOrder: true } });
  const nextOrder = (max._max.sortOrder ?? 0) + 1;
  try {
    const slug = await uniqueCategorySlug(trimmed);
    const created = await db.category.create({
      data: { name: trimmed, slug, isCustom: true, active: true, sortOrder: nextOrder },
    });
    return Response.json({
      success: true,
      category: { id: created.id, name: created.name, active: created.active, isCustom: created.isCustom },
    });
  } catch (error) {
    // Concurrent same-name creates: retry once with a fresh suffixed slug.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const slug = await uniqueCategorySlug(`${trimmed}-${Date.now() % 10000}`);
      const created = await db.category.create({
        data: { name: trimmed, slug, isCustom: true, active: true, sortOrder: nextOrder },
      });
      return Response.json({
        success: true,
        category: { id: created.id, name: created.name, active: created.active, isCustom: created.isCustom },
      });
    }
    throw error;
  }
  } catch (e) {
    return routeError(e);
  }
}