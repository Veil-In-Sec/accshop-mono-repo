import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common"
import { IsOptional, IsString } from "class-validator"

import { CurrentUser } from "../auth/current-user.decorator"
import { SessionGuard } from "../auth/session.guard"
import { AdminGuard } from "../auth/admin.guard"
import type { SessionUser } from "../auth/auth.constants"
import { WalletService } from "../wallet/wallet.service"
import { DepositsService } from "./deposits.service"
import { ReviewDepositDto, SubmitDepositDto } from "./dto/deposits.dto"

export class StatusQueryDto {
  @IsOptional()
  @IsString()
  status?: string
}

@Controller("deposits")
@UseGuards(SessionGuard)
export class DepositsController {
  constructor(
    private readonly deposits: DepositsService,
    private readonly wallet: WalletService,
  ) {}

  /** Submits a deposit request for admin review. */
  @Post()
  async submit(@CurrentUser() user: SessionUser, @Body() dto: SubmitDepositDto) {
    await this.wallet.getOrCreateWallet(user.id)
    return this.deposits.submit(user.id, dto)
  }

  /** The signed-in user's own deposit requests. */
  @Get("mine")
  listMine(@CurrentUser() user: SessionUser) {
    return this.deposits.listMine(user.id)
  }
}

@Controller("admin/deposits")
@UseGuards(AdminGuard)
export class AdminDepositsController {
  constructor(private readonly deposits: DepositsService) {}

  @Get()
  listAll(@Query() query: StatusQueryDto) {
    return this.deposits.listAll(query.status)
  }

  @Post(":id/review")
  review(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ReviewDepositDto,
  ) {
    return this.deposits.review(id, dto.decision, dto.note)
  }
}
