import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import type { Request } from "express"
import { fromNodeHeaders } from "better-auth/node"

import { BETTER_AUTH, type SessionUser } from "./auth.constants"

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(BETTER_AUTH) private readonly auth: unknown) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const auth = this.auth as {
      api: {
        getSession: (args: {
          headers: unknown
        }) => Promise<{ user: SessionUser } | null>
      }
    }

    let session: { user: SessionUser } | null
    try {
      session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      })
    } catch {
      throw new UnauthorizedException()
    }

    if (!session?.user) {
      throw new UnauthorizedException()
    }

    ;(request as Request & { user: SessionUser }).user = session.user
    return true
  }
}
