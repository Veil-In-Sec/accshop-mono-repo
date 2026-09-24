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

function optStr(v: unknown, max: number, field: string): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string" || v.length > max) throw jsonError(400, `${field} must be a string of max ${max} characters.`);
  return v;
}

export async function GET(req: Request) {
  try {
  await requireAdmin(req);
  return Response.json(await db.testimonial.findMany({ orderBy: { sortOrder: "asc" } }));
  } catch (e) {
    return routeError(e);
  }
}

export async function POST(req: Request) {
  try {
  await requireAdmin(req);
  const body = (await readJson(req)) as {
    id?: unknown;
    stars?: unknown;
    tag?: unknown;
    quote?: unknown;
    name?: unknown;
    role?: unknown;
    avatar?: unknown;
  };

  const id = coerceOptionalId(body.id);
  let stars: number | undefined;
  if (body.stars !== undefined && body.stars !== null) {
    const n = typeof body.stars === "number" ? body.stars : Number(body.stars);
    if (!Number.isInteger(n)) throw jsonError(400, "stars must be an integer.");
    stars = n;
  }
  const tag = optStr(body.tag, 60, "tag");
  if (typeof body.quote !== "string" || body.quote.length < 1 || body.quote.length > 1000) {
    throw jsonError(400, "quote must be a string of 1-1000 characters.");
  }
  if (typeof body.name !== "string" || body.name.length < 1 || body.name.length > 120) {
    throw jsonError(400, "name must be a string of 1-120 characters.");
  }
  const role = optStr(body.role, 160, "role");
  const avatar = optStr(body.avatar, 500, "avatar");

  const data = {
    stars: Math.min(5, Math.max(1, Math.round(stars ?? 5))),
    tag: tag?.trim() || "",
    quote: body.quote,
    name: body.name,
    role: role?.trim() || "",
    avatar: avatar?.trim() || "",
  };

  if (id) {
    try {
      await db.testimonial.update({ where: { id }, data });
    } catch (error) {
      if (isPrismaNotFound(error)) throw jsonError(404, "Testimonial not found.");
      throw error;
    }
  } else {
    const last = await db.testimonial.findFirst({ orderBy: { sortOrder: "desc" } });
    await db.testimonial.create({
      data: { ...data, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
  }
  return Response.json({ success: true });
  } catch (e) {
    return routeError(e);
  }
}