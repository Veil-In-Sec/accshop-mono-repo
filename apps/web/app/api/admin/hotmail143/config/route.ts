import { requireAdmin } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { readJson } from "@/lib/server/http";
import { badRequest, routeError } from "@/lib/server/upstream";

function assertValidUrl(value: string, field: string) {
  try {
    const url = new URL(value);
    if (!url.protocol.startsWith("http")) badRequest(`${field} must be a valid URL.`);
  } catch {
    badRequest(`${field} must be a valid URL.`);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await readJson<{ apiKey?: unknown; baseUrl?: unknown }>(req);

    // Manual Hotmail143ConfigDto validation -> 400 (mirrors the Nest DTO bounds).
    const data: { hotmailApiKey?: string | null; hotmailApiBaseUrl?: string | null } = {};
    if (body.apiKey !== undefined) {
      if (typeof body.apiKey !== "string" || body.apiKey.length > 200) {
        badRequest("apiKey must be a string of at most 200 characters.");
      }
      data.hotmailApiKey = body.apiKey || null;
    }
    if (body.baseUrl !== undefined) {
      if (typeof body.baseUrl !== "string" || body.baseUrl.length > 500) {
        badRequest("baseUrl must be a string of at most 500 characters.");
      }
      if (body.baseUrl) assertValidUrl(body.baseUrl, "baseUrl");
      data.hotmailApiBaseUrl = body.baseUrl || null;
    }

    await db.siteSetting.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    });
    return Response.json({ success: true });
  } catch (e) {
    return routeError(e);
  }
}
