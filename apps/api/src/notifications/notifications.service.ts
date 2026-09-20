import { Injectable } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.module"

function toDto(n: {
  id: number
  userId: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: Date
}) {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { id: "desc" },
      take: 30,
    })
    return rows.map(toDto)
  }

  async unreadCount(userId: string) {
    const unread = await this.prisma.notification.count({ where: { userId, read: false } })
    return { unread }
  }

  async markRead(userId: string, id: number) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } })
    return { success: true }
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
    return { success: true }
  }

  async notify(userId: string, type: string, title: string, body: string) {
    await this.prisma.notification.create({ data: { userId, type, title, body } })
  }
}
