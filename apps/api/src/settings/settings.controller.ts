import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common"

import { AdminGuard } from "../auth/admin.guard"
import { SettingsService } from "./settings.service"
import { UpdateSettingsDto } from "./dto/update-settings.dto"

@Controller("settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** Public site settings for deposit/currency display. No auth required. */
  @Get()
  getPublic() {
    return this.settings.getPublicSettings()
  }
}

@Controller("admin/settings")
@UseGuards(AdminGuard)
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  getAdmin() {
    return this.settings.getAdminSettings()
  }

  @Put()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.updateSettings(dto)
  }
}
