import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common"
import { IsString, MaxLength, MinLength } from "class-validator"

import { CurrentUser } from "../auth/current-user.decorator"
import { SessionGuard } from "../auth/session.guard"
import type { SessionUser } from "../auth/auth.constants"
import { VerificationCodesService } from "./verification-codes.service"

export class GmailCodeQueryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(320)
  email!: string
}

export class OutlookCodeQueryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(320)
  email!: string
}

export class HotmailCodeDto {
  @IsString()
  @MinLength(5)
  @MaxLength(8000)
  data!: string
}

@Controller("verification-codes")
@UseGuards(SessionGuard)
export class VerificationCodesController {
  constructor(private readonly codes: VerificationCodesService) {}

  /** Purchased emails for quick-pick dropdowns. */
  @Get("emails")
  myEmails(@CurrentUser() user: SessionUser) {
    return this.codes.listMyEmails(user.id)
  }

  /**
   * GET /verification-codes/gmail?email=foo@gmail.com
   * Proxies Hotmail143 GET /gmail/code. Only owned (purchased) emails allowed.
   */
  @Get("gmail")
  gmail(@Query() query: GmailCodeQueryDto, @CurrentUser() user: SessionUser) {
    return this.codes.getGmailCode(user.id, query.email)
  }

  /**
   * GET /verification-codes/outlook?email=foo@outlook.com
   * Proxies Hotmail143 GET /outlook-code (auto-renew aware).
   * Only owned (purchased) emails allowed — renewals are charged.
   */
  @Get("outlook")
  outlook(@Query() query: OutlookCodeQueryDto, @CurrentUser() user: SessionUser) {
    return this.codes.getOutlookCode(user.id, query.email)
  }

  /**
   * POST /verification-codes/hotmail { data: "email|password|refresh_token|client_id" }
   * Accepts the full 4-part line (proxies Hotmail143 `hotmail-code`) as well as
   * `email` / `email|password` lines (proxies Hotmail143 `outlook-code`).
   * Returns a `{ kind, result }` envelope. Only emails from the caller's
   * completed orders are allowed.
   */
  @Post("hotmail")
  hotmail(@Body() dto: HotmailCodeDto, @CurrentUser() user: SessionUser) {
    return this.codes.getHotmailCode(user.id, dto.data)
  }
}
