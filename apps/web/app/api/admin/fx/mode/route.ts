import { requireAdmin } from "@/lib/server/admin";
import { db } from "@/lib/server/db";
import { readJson } from "@/lib/server/http";
import { badRequest, routeError } from "@/lib/server/upstream";

/** Switches the USD → local rate between live internet rate and the flat value. */
export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await readJson<{ live?: unknown }>(req);

    // Manual UpdateFxModeDto validation -> 400 (mirrors @IsBoolean live).
    if (typeof body.live !== "boolean") {
      badRequest("live must be a boolean.");
    }

    await db.siteSetting.upsert({
      where: { id: 1 },
      create: { id: 1, fxLiveEnabled: body.live },
      update: { fxLiveEnabled: body.live },
    });
    return Response.json({
      success: true,
      message: body.live ? "Live internet rate enabled." : "Flat rate enabled.",
    });
  } catch (e) {
    return routeError(e);
  }
}
