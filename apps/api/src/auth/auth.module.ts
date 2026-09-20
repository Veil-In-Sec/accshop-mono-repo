import { Global, Module } from "@nestjs/common"

import { auth } from "./better-auth"
import { AdminGuard } from "./admin.guard"
import { SessionGuard } from "./session.guard"
import { BETTER_AUTH } from "./auth.constants"

@Global()
@Module({
  providers: [
    { provide: BETTER_AUTH, useValue: auth },
    SessionGuard,
    AdminGuard,
  ],
  exports: [SessionGuard, AdminGuard, BETTER_AUTH],
})
export class AuthModule {}
