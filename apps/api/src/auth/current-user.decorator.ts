import { createParamDecorator, ExecutionContext } from "@nestjs/common"
import type { Request } from "express"

import type { SessionUser } from "./auth.constants"

export function getRequestUser(request: Request): SessionUser | undefined {
  return (request as Request & { user?: SessionUser }).user
}

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  return getRequestUser(context.switchToHttp().getRequest<Request>())
})
