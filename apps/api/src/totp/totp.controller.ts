import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common"

import { CurrentUser } from "../auth/current-user.decorator"
import { SessionGuard } from "../auth/session.guard"
import type { SessionUser } from "../auth/auth.constants"
import { TotpService } from "./totp.service"
import { CreateTotpKeyDto, UpdateTotpKeyDto } from "./dto/totp.dto"

@Controller("totp")
@UseGuards(SessionGuard)
export class TotpController {
  constructor(private readonly totp: TotpService) {}

  /** Saved keys (metadata only — never secrets). */
  @Get("keys")
  keys(@CurrentUser() user: SessionUser) {
    return this.totp.listKeys(user.id)
  }

  /** Live codes for all keys — poll once per period rollover. */
  @Get("codes")
  codes(@CurrentUser() user: SessionUser) {
    return this.totp.currentCodes(user.id)
  }

  /** Save a key. Accepts a raw Base32 secret or an otpauth:// URI. */
  @Post("keys")
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateTotpKeyDto) {
    return this.totp.createKey(user.id, dto)
  }

  /** Rename / re-issuer a key. */
  @Patch("keys/:id")
  rename(
    @CurrentUser() user: SessionUser,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTotpKeyDto,
  ) {
    return this.totp.renameKey(user.id, id, dto)
  }

  @Delete("keys/:id")
  remove(@CurrentUser() user: SessionUser, @Param("id", ParseIntPipe) id: number) {
    return this.totp.deleteKey(user.id, id)
  }
}
