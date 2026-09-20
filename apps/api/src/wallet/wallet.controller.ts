import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common"
import { Type } from "class-transformer"
import {
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator"

import { CurrentUser } from "../auth/current-user.decorator"
import { SessionGuard } from "../auth/session.guard"
import type { SessionUser } from "../auth/auth.constants"
import { WalletService } from "./wallet.service"

export class TransferDto {
  @IsEmail()
  @MaxLength(320)
  recipientEmail!: string

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(1_000_000)
  amount!: number
}

export class PurchaseDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentMethodId?: number

  @IsOptional()
  @IsString()
  @MaxLength(200)
  transactionReference?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity?: number

  @IsOptional()
  @IsString()
  @MaxLength(120)
  senderAccountNumber?: string
}

@Controller("wallet")
@UseGuards(SessionGuard)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  /** Ensures the wallet exists and returns it. */
  @Get()
  getWallet(@CurrentUser() user: SessionUser) {
    return this.wallet.getOrCreateWallet(user.id)
  }

  /** Balance + order history + transactions for the signed-in user. */
  @Get("data")
  getData(@CurrentUser() user: SessionUser) {
    return this.wallet.getWalletData(user.id)
  }

  /** Seeds the wallet after sign-up. */
  @Post("init")
  init(@CurrentUser() user: SessionUser) {
    return this.wallet.initializeAccount(user.id)
  }

  /** Sends balance to another AccShop account by email. */
  @Post("transfer")
  transfer(@CurrentUser() user: SessionUser, @Body() dto: TransferDto) {
    return this.wallet.transferBalance(user.id, dto.recipientEmail, dto.amount)
  }

  /** Places a product order, paid directly from the wallet (deposit) balance. */
  @Post("purchase")
  purchase(@CurrentUser() user: SessionUser, @Body() dto: PurchaseDto) {
    return this.wallet.purchaseProduct(
      user.id,
      dto.productId,
      dto.paymentMethodId,
      dto.transactionReference,
      dto.quantity,
      dto.senderAccountNumber,
    )
  }
}
