import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common"

import { CurrentUser } from "../auth/current-user.decorator"
import { SessionGuard } from "../auth/session.guard"
import type { SessionUser } from "../auth/auth.constants"
import { NotificationsService } from "./notifications.service"

@Controller("notifications")
@UseGuards(SessionGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.notifications.list(user.id)
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: SessionUser) {
    return this.notifications.unreadCount(user.id)
  }

  @Post("read-all")
  readAll(@CurrentUser() user: SessionUser) {
    return this.notifications.markAllRead(user.id)
  }

  @Post(":id/read")
  read(@CurrentUser() user: SessionUser, @Param("id", ParseIntPipe) id: number) {
    return this.notifications.markRead(user.id, id)
  }
}
