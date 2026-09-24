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
  return Response.json(await db.faq.findMany({ orderBy: { sortOrder: "asc" } }));
  } catch (e) {
    return routeError(e);
  }
}

export async function POST(req: Request) {
  try {
  await requireAdmin(req);
  const body = (await readJson(req)) as { id?: unknown; question?: unknown; answer?: unknown };

  const id = coerceOptionalId(body.id);
  if (typeof body.question !== "string" || body.question.length < 1 || body.question.length > 300) {
    throw jsonError(400, "question must be a string of 1-300 characters.");
  }
  if (typeof body.answer !== "string" || body.answer.length < 1 || body.answer.length > 2000) {
    throw jsonError(400, "answer must be a string of 1-2000 characters.");
  }

  try {
    if (id) {
      await db.faq.update({
        where: { id },
        data: { question: body.question, answer: body.answer },
      });
    } else {
      const last = await db.faq.findFirst({ orderBy: { sortOrder: "desc" } });
      await db.faq.create({
        data: { question: body.question, answer: body.answer, sortOrder: (last?.sortOrder ?? -1) + 1 },
      });
    }
  } catch (error) {
    if (isPrismaNotFound(error)) throw jsonError(404, "FAQ not found.");
    throw error;
  }
  return Response.json({ success: true });
  } catch (e) {
    return routeError(e);
  }
}