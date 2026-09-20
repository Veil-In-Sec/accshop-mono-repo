import { BadRequestException, Injectable } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.module"

export type SupportSender = "customer" | "admin"

const MAX_MESSAGE_LENGTH = 2000

function toMessageDto(m: {
  id: number
  userId: string
  sender: string
  text: string
  read: boolean
  createdAt: Date
}) {
  return {
    id: m.id,
    userId: m.userId,
    sender: m.sender,
    text: m.text,
    read: m.read,
    createdAt: m.createdAt.toISOString(),
  }
}

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  private cleanText(text: string): string {
    const trimmed = text?.trim() ?? ""
    if (!trimmed) throw new BadRequestException("Message cannot be empty.")
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`)
    }
    return trimmed
  }

  /** Customer thread (oldest first). Marks admin replies as read. */
  async listMessages(userId: string) {
    const [rows] = await Promise.all([
      this.prisma.supportMessage.findMany({
        where: { userId },
        orderBy: { id: "asc" },
        take: 500,
      }),
      this.prisma.supportMessage.updateMany({
        where: { userId, sender: "admin", read: false },
        data: { read: true },
      }),
    ])
    return rows.map(toMessageDto)
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.supportMessage.count({
      where: { userId, sender: "admin", read: false },
    })
    return { unread: count }
  }

  async sendCustomerMessage(userId: string, text: string) {
    const created = await this.prisma.supportMessage.create({
      data: { userId, sender: "customer", text: this.cleanText(text) },
    })
    return { success: true, message: toMessageDto(created) }
  }

  // --- Admin ---------------------------------------------------------------

  /** One entry per user: email, last message preview, unread (customer) count. */
  async listConversations() {
    // DB-side distinct users + counts; only the latest message per user is
    // fetched individually. Avoids loading 2000 rows into memory.
    const grouped = await this.prisma.supportMessage.groupBy({
      by: ["userId"],
      _count: { _all: true },
      _max: { id: true },
    })
    if (grouped.length === 0) return []

    const maxIds = grouped.map((g) => g._max.id).filter((v): v is number => v != null)
    const [lastMessages, unreadGroups] = await Promise.all([
      maxIds.length > 0
        ? this.prisma.supportMessage.findMany({ where: { id: { in: maxIds } } })
        : [],
      this.prisma.supportMessage.groupBy({
        by: ["userId"],
        _count: { _all: true },
        where: { sender: "customer", read: false },
      }),
    ])
    const lastByUser = new Map(lastMessages.map((m) => [m.userId, m]))
    const unreadByUser = new Map(unreadGroups.map((g) => [g.userId, g._count._all]))
    const totalByUser = new Map(grouped.map((g) => [g.userId, g._count._all]))

    const userIds = [...lastByUser.keys()]
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({ where: { id: { in: userIds } } })
        : []
    const emailByUserId = new Map(users.map((u) => [u.id, u.email]))
    const nameByUserId = new Map(users.map((u) => [u.id, u.name]))

    return [...lastByUser.entries()]
      .map(([userId, last]) => ({
        userId,
        userEmail: emailByUserId.get(userId) ?? userId,
        userName: nameByUserId.get(userId) ?? "",
        lastText: last.text,
        lastSender: last.sender,
        lastAt: last.createdAt.toISOString(),
        unread: unreadByUser.get(userId) ?? 0,
        total: totalByUser.get(userId) ?? 0,
      }))
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
  }

  /** Full thread for one user (oldest first). Marks customer messages as read. */
  async getThread(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    const [rows] = await Promise.all([
      this.prisma.supportMessage.findMany({
        where: { userId },
        orderBy: { id: "asc" },
        take: 500,
      }),
      this.prisma.supportMessage.updateMany({
        where: { userId, sender: "customer", read: false },
        data: { read: true },
      }),
    ])
    return {
      userId,
      userEmail: user?.email ?? userId,
      userName: user?.name ?? "",
      messages: rows.map(toMessageDto),
    }
  }

  async replyAsAdmin(userId: string, text: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new BadRequestException("User not found.")
    const created = await this.prisma.supportMessage.create({
      data: { userId, sender: "admin", text: this.cleanText(text) },
    })
    return { success: true, message: toMessageDto(created) }
  }

  async totalUnread() {
    const unread = await this.prisma.supportMessage.count({
      where: { sender: "customer", read: false },
    })
    return { unread }
  }
}
