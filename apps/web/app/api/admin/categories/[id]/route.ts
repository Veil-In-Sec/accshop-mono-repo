import { requireAdmin } from "@/lib/server/admin";
import { jsonError } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { readJson } from "@/lib/server/http";
import { routeError } from "@/lib/server/upstream";

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

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id)) throw jsonError(400, "Invalid category id.");
  return id;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: raw } = await params;
    const id = parseId(raw);
    const body = await readJson<{ name?: unknown; active?: unknown }>(req);

    // Manual UpdateCategoryDto validation -> 400.
    let name: string | undefined;
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length < 1 || body.name.length > 60) {
        throw jsonError(400, "name must be a string of length 1-60.");
      }
      name = body.name;
    }
    let active: boolean | undefined;
    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") throw jsonError(400, "active must be a boolean.");
      active = body.active;
    }

    // NOTE (port difference): NestJS threw BadRequestException (400) for a
    // missing category here; preserved as 400 to keep admin UI behavior identical.
    const cat = await db.category.findUnique({ where: { id } });
    if (!cat) throw jsonError(400, "Category not found.");

    // Rename + product regroup must be atomic — partial failure otherwise
    // leaves products pointing at the old category name.
    return Response.json(
      await db.$transaction(async (tx) => {
        const data: { name?: string; slug?: string; active?: boolean } = {};
        if (name !== undefined) {
          const trimmed = name.trim();
          if (!trimmed) throw jsonError(400, "Category name is required.");
          if (trimmed.toLowerCase() !== cat.name.toLowerCase()) {
            const clash = await tx.category.findFirst({
              where: { name: { equals: trimmed, mode: "insensitive" }, NOT: { id } },
            });
            if (clash) throw jsonError(400, "A category with this name already exists.");
            await tx.product.updateMany({
              where: { category: cat.name },
              data: { category: trimmed },
            });
            data.name = trimmed;
            data.slug = await uniqueCategorySlug(trimmed, id);
          }
        }
        if (active !== undefined) data.active = active;

        if (Object.keys(data).length === 0) return { success: true };
        const updated = await tx.category.update({ where: { id }, data });
        return {
          success: true,
          category: { id: updated.id, name: updated.name, active: updated.active, isCustom: updated.isCustom },
        };
      }),
    );
  } catch (e) {
    return routeError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: raw } = await params;
    const id = parseId(raw);

    // NOTE (port difference): NestJS threw BadRequestException (400) for a
    // missing/in-use category here; preserved as 400.
    const cat = await db.category.findUnique({ where: { id } });
    if (!cat) throw jsonError(400, "Category not found.");
    const used = await db.product.count({ where: { category: cat.name } });
    if (used > 0) {
      throw jsonError(
        400,
        `Cannot delete "${cat.name}" because ${used} product(s) still use it. Reassign or remove those products first.`,
      );
    }
    await db.category.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (e) {
    return routeError(e);
  }
}