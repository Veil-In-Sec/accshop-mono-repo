import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../prisma/prisma.module"

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Enabled payment methods for the deposit page. No auth required. */
  async listEnabled() {
    const rows = await this.prisma.paymentMethod.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" },
    })
    return rows.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      accountNumber: m.accountNumber ?? "",
      accountName: m.accountName ?? "",
      instructions: m.instructions ?? "",
      icon: m.icon ?? "",
    }))
  }

  async listAll() {
    const rows = await this.prisma.paymentMethod.findMany({ orderBy: { sortOrder: "asc" } })
    return rows.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      accountNumber: m.accountNumber ?? "",
      accountName: m.accountName ?? "",
      instructions: m.instructions ?? "",
      icon: m.icon ?? "",
      enabled: m.enabled,
      sortOrder: m.sortOrder,
    }))
  }

  async upsert(input: {
    id?: number
    name: string
    type: string
    accountNumber?: string
    accountName?: string
    instructions?: string
    icon?: string
    enabled: boolean
    sortOrder: number
  }) {
    const data = {
      name: input.name,
      type: input.type,
      accountNumber: input.accountNumber || null,
      accountName: input.accountName || null,
      instructions: input.instructions || null,
      icon: input.icon || null,
      enabled: input.enabled,
      sortOrder: input.sortOrder,
    }

    if (input.id) {
      try {
        await this.prisma.paymentMethod.update({
          where: { id: input.id },
          data: { ...data, updatedAt: new Date() },
        })
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
          throw new NotFoundException("Payment method not found.")
        }
        throw error
      }
    } else {
      await this.prisma.paymentMethod.create({ data })
    }

    return { success: true }
  }

  async remove(id: number) {
    const used = await this.prisma.depositRequest.count({ where: { paymentMethodId: id } })
    if (used > 0) {
      throw new BadRequestException(
        "Cannot delete this payment method because deposit requests reference it. Disable it instead.",
      )
    }
    try {
      await this.prisma.paymentMethod.delete({ where: { id } })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("Payment method not found.")
      }
      throw error
    }
    return { success: true }
  }
}
