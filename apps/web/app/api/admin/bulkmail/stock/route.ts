import { requireAdmin } from "@/lib/server/admin";
import { getBulkMailStock } from "@/lib/server/bulkmail";
import { routeError } from "@/lib/server/upstream";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    return Response.json(await getBulkMailStock());
  } catch (e) {
    return routeError(e);
  }
}
