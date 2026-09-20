import { createHmac, timingSafeEqual } from "crypto"

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import type { Request } from "express"

export const ADMIN_COOKIE_NAME = "admin_session"

/** Constant-time string comparison to avoid leaking secrets via timing. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8")
  const bb = Buffer.from(b, "utf8")
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

export function signAdminToken() {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set")
  const password = process.env.ADMIN_PASSWORD ?? ""
  return createHmac("sha256", secret).update(`admin:${password}`).digest("hex")
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return safeEqual(password, expected)
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    let token: string | undefined
    try {
      token = signAdminToken()
    } catch {
      throw new UnauthorizedException()
    }
    const presented = request.cookies?.[ADMIN_COOKIE_NAME]
    if (typeof presented === "string" && safeEqual(presented, token)) {
      return true
    }
    throw new UnauthorizedException()
  }
}
