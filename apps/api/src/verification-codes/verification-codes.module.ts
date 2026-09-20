import { Module } from "@nestjs/common"

import { Hotmail143Module } from "../hotmail143/hotmail143.module"
import { VerificationCodesController } from "./verification-codes.controller"
import { VerificationCodesService } from "./verification-codes.service"

@Module({
  imports: [Hotmail143Module],
  controllers: [VerificationCodesController],
  providers: [VerificationCodesService],
  exports: [VerificationCodesService],
})
export class VerificationCodesModule {}
