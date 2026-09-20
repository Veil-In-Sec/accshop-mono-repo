import { Module } from "@nestjs/common"

import { SettingsController, AdminSettingsController } from "./settings.controller"
import { SettingsService } from "./settings.service"

@Module({
  controllers: [SettingsController, AdminSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
