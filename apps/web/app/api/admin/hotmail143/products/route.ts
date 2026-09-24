import { requireAdmin } from "@/lib/server/admin";
import { listHotmailProducts } from "@/lib/server/hotmail143";
import { routeError } from "@/lib/server/upstream";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    return Response.json(await listHotmailProducts());
  } catch (e) {
    return routeError(e);
  }
}
