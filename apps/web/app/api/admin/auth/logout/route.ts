import { ADMIN_COOKIE_NAME } from "@/lib/server/admin";
import { routeError } from "@/lib/server/upstream";
import { publicOriginIsHttps } from "@/lib/admin-token";

export async function POST() {
  try {
  const res = Response.json({ success: true, message: "Signed out." });
  const secure = publicOriginIsHttps() ? "; Secure" : "";
  res.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  );
  return res;
  } catch (e) {
    return routeError(e);
  }
}