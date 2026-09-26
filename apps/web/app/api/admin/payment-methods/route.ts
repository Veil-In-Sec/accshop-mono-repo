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

function coerceSortOrder(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isInteger(n)) throw jsonError(400, "sortOrder must be an integer.");
  return n;
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const rows = await db.paymentMethod.findMany({ orderBy: { sortOrder: "asc" } });
    return Response.json(
      rows.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        accountNumber: m.accountNumber ?? "",
        accountName: m.accountName ?? "",
        instructions: m.instructions ?? "",
        icon: m.icon ?? "",
        enabled: m.enabled,
        sortOrder: m.sortOrder,
      })),
    );
  } catch (e) {
    return routeError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = (await readJson(req)) as {
    id?: unknown;
    name?: unknown;
    type?: unknown;
    accountNumber?: unknown;
    accountName?: unknown;
    instructions?: unknown;
    icon?: unknown;
    enabled?: unknown;
    sortOrder?: unknown;
  };

  const id = coerceOptionalId(body.id);
  if (typeof body.name !== "string" || body.name.length < 1 || body.name.length > 80) {
    throw jsonError(400, "name must be a string of 1-80 characters.");
  }
  if (typeof body.type !== "string" || body.type.length < 1 || body.type.length > 40) {
    throw jsonError(400, "type must be a string of 1-40 characters.");
  }
  const accountNumber = optStr(body.accountNumber, 120, "accountNumber");
  const accountName = optStr(body.accountName, 120, "accountName");
  const instructions = optStr(body.instructions, 2000, "instructions");
  const icon = optStr(body.icon, 500, "icon");
  if (typeof body.enabled !== "boolean") throw jsonError(400, "enabled must be a boolean.");
  const sortOrder = coerceSortOrder(body.sortOrder);

  const data = {
    name: body.name,
    type: body.type,
    accountNumber: accountNumber || null,
    accountName: accountName || null,
    instructions: instructions || null,
    icon: icon || null,
    enabled: body.enabled,
    sortOrder,
  };

  try {
    if (id) {
      await db.paymentMethod.update({
        where: { id },
        data: { ...data, updatedAt: new Date() },
      });
    } else {
      await db.paymentMethod.create({ data });
    }
  } catch (error) {
    if (isPrismaNotFound(error)) throw jsonError(404, "Payment method not found.");
    throw error;
  }

    return Response.json({ success: true });
  } catch (e) {
    return routeError(e);
  }
}
