import { requireAdmin } from "@/lib/server/admin";
import { jsonError } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { isPrismaNotFound, readJson } from "@/lib/server/http";
import { routeError } from "@/lib/server/upstream";

function coerceOptionalId(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isInteger(n)) throw jsonError(400, "id must be an integer.");
  return n;
}

export async function GET(req: Request) {
  try {
  await requireAdmin(req);
  return Response.json(await db.feature.findMany({ orderBy: { sortOrder: "asc" } }));
  } catch (e) {
    return routeError(e);
  }
}

export async function POST(req: Request) {
  try {
  await requireAdmin(req);
  const body = (await readJson(req)) as { id?: unknown; icon?: unknown; title?: unknown; description?: unknown };

  const id = coerceOptionalId(body.id);
  if (typeof body.icon !== "string" || body.icon.length > 40) {
    throw jsonError(400, "icon must be a string of max 40 characters.");
  }
  if (typeof body.title !== "string" || body.title.length < 1 || body.title.length > 120) {
    throw jsonError(400, "title must be a string of 1-120 characters.");
  }
  if (typeof body.description !== "string" || body.description.length < 1 || body.description.length > 1000) {
    throw jsonError(400, "description must be a string of 1-1000 characters.");
  }

  try {
    if (id) {
      await db.feature.update({
        where: { id },
        data: { icon: body.icon, title: body.title, description: body.description },
      });
    } else {
      const last = await db.feature.findFirst({ orderBy: { sortOrder: "desc" } });
      await db.feature.create({
        data: { icon: body.icon, title: body.title, description: body.description, sortOrder: (last?.sortOrder ?? -1) + 1 },
      });
    }
  } catch (error) {
    if (isPrismaNotFound(error)) throw jsonError(404, "Feature not found.");
    throw error;
  }
  return Response.json({ success: true });
  } catch (e) {
    return routeError(e);
  }
}