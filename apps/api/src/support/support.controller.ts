import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common"
import { IsString, MaxLength, MinLength } from "class-validator"

import { CurrentUser } from "../auth/current-user.decorator"
import { SessionGuard } from "../auth/session.guard"
import type { SessionUser } from "../auth/auth.constants"
import { SupportService } from "./support.service"

export class SendSupportMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string
}

@Controller("support")
@UseGuards(SessionGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  /** Own thread with the admin team (oldest first). */
  @Get("messages")
  messages(@CurrentUser() user: SessionUser) {
    return this.support.listMessages(user.id)
  }

  /** Unread admin replies for the chat badge. */
  @Get("unread-count")
  unreadCount(@CurrentUser() user: SessionUser) {
    return this.support.unreadCount(user.id)
  }

  /** Send a message to the admin team. */
  @Post("messages")
  send(@CurrentUser() user: SessionUser, @Body() dto: SendSupportMessageDto) {
    return this.support.sendCustomerMessage(user.id, dto.text)
  }
}
