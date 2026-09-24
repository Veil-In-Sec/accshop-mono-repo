import { routeError } from "@/lib/server/upstream";
export async function GET() {
  try {
  return Response.json({
    status: "ok",
    service: "accshop-web",
    timestamp: new Date().toISOString(),
  })
  } catch (e) {
    return routeError(e);
  }
}