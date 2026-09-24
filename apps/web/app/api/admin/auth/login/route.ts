import { ADMIN_COOKIE_NAME, signAdminToken, verifyAdminPassword } from "@/lib/server/admin";
import { jsonError } from "@/lib/server/auth";
import { readJson } from "@/lib/server/http";
import { routeError } from "@/lib/server/upstream";

const MAX_AGE = 60 * 60 * 12; // 12 hours, in seconds

export async function POST(req: Request) {
  try {
  const body = await readJson<{ password?: unknown }>(req);
  const ok = typeof body.password === "string" && verifyAdminPassword(body.password);
  if (!ok) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    throw jsonError(400, "Incorrect password.");
  }
  const res = Response.json({ success: true, message: "Signed in." });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=${signAdminToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`,
  );
  return res;
  } catch (e) {
    return routeError(e);
  }
}