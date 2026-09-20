import { Module } from "@nestjs/common"

import { TotpController } from "./totp.controller"
import { TotpService } from "./totp.service"
import { TotpVaultService } from "./vault.service"

@Module({
  controllers: [TotpController],
  providers: [TotpService, TotpVaultService],
  exports: [TotpService],
})
export class TotpModule {}
