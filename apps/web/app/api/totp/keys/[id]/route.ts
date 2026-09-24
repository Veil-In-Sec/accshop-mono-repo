import { jsonError, requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { readJson } from "@/lib/server/http";
import { badRequest, routeError } from "@/lib/server/upstream";

function toMeta(row: {
  id: number;
  label: string;
  issuer: string;
  algorithm: string;
  digits: number;
  period: number;
  createdAt: Date;
}) {
  return {
    id: row.id,
    label: row.label,
    issuer: row.issuer,
    algorithm: row.algorithm,
    digits: row.digits,
    period: row.period,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Rename / re-issuer a key. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const { id: raw } = await params;
    const id = Number(raw);
    if (!Number.isInteger(id)) return jsonError(400, "Invalid key id.");

    const body = await readJson<{ label?: unknown; issuer?: unknown }>(req);

    // Manual UpdateTotpKeyDto validation -> 400 (mirrors the Nest DTO bounds).
    const data: { label?: string; issuer?: string } = {};
    if (body.label !== undefined) {
      if (typeof body.label !== "string" || body.label.length > 80) {
        badRequest("label must be a string of at most 80 characters.");
      }
      const trimmed = body.label.trim();
      if (!trimmed) badRequest("Label cannot be empty.");
      data.label = trimmed;
    }
    if (body.issuer !== undefined) {
      if (typeof body.issuer !== "string" || body.issuer.length > 80) {
        badRequest("issuer must be a string of at most 80 characters.");
      }
      data.issuer = body.issuer.trim();
    }
    if (Object.keys(data).length === 0) {
      badRequest("Nothing to update.");
    }

    // updateMany keeps the ownership check atomic (no TOCTOU, no enumeration).
    const res = await db.totpKey.updateMany({
      where: { id, userId: user.id },
      data,
    });
    if (res.count === 0) return jsonError(404, "Key not found.");
    const row = await db.totpKey.findUnique({ where: { id } });
    if (!row) return jsonError(404, "Key not found.");
    return Response.json(toMeta(row));
  } catch (e) {
    return routeError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const { id: raw } = await params;
    const id = Number(raw);
    if (!Number.isInteger(id)) return jsonError(400, "Invalid key id.");

    const res = await db.totpKey.deleteMany({ where: { id, userId: user.id } });
    if (res.count === 0) return jsonError(404, "Key not found.");
    return Response.json({ success: true });
  } catch (e) {
    return routeError(e);
  }
}
