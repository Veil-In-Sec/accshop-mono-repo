import { Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../prisma/prisma.module"

function prismaNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025"
}

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  listFeatures() {
    return this.prisma.feature.findMany({ orderBy: { sortOrder: "asc" } })
  }

  listFaqs() {
    return this.prisma.faq.findMany({ orderBy: { sortOrder: "asc" } })
  }

  listTestimonials() {
    return this.prisma.testimonial.findMany({ orderBy: { sortOrder: "asc" } })
  }

  async upsertFeature(input: { id?: number; icon: string; title: string; description: string }) {
    try {
      if (input.id) {
        await this.prisma.feature.update({
          where: { id: input.id },
          data: {
            icon: input.icon,
            title: input.title,
            description: input.description,
          },
        })
      } else {
        const last = await this.prisma.feature.findFirst({ orderBy: { sortOrder: "desc" } })
        await this.prisma.feature.create({
          data: { ...input, sortOrder: (last?.sortOrder ?? -1) + 1 },
        })
      }
    } catch (error) {
      if (prismaNotFound(error)) throw new NotFoundException("Feature not found.")
      throw error
    }
    return { success: true }
  }

  async deleteFeature(id: number) {
    const row = await this.prisma.feature.delete({ where: { id } }).catch((error) => {
      if (prismaNotFound(error)) throw new NotFoundException("Feature not found.")
      return null
    })
    if (!row) return { success: false, message: "Feature not found." }
    await this.prisma.feature.updateMany({
      data: { sortOrder: { decrement: 1 } },
      where: { sortOrder: { gt: row.sortOrder } },
    })
    return { success: true }
  }

  async moveFeature(id: number, direction: "up" | "down") {
    const rows = await this.prisma.feature.findMany({ orderBy: { sortOrder: "asc" } })
    const index = rows.findIndex((r) => r.id === id)
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= rows.length) return { success: false }
    await this.prisma.$transaction([
      this.prisma.feature.update({ where: { id: rows[index].id }, data: { sortOrder: swapIndex } }),
      this.prisma.feature.update({ where: { id: rows[swapIndex].id }, data: { sortOrder: index } }),
    ])
    return { success: true }
  }

  async upsertFaq(input: { id?: number; question: string; answer: string }) {
    try {
      if (input.id) {
        await this.prisma.faq.update({
          where: { id: input.id },
          data: { question: input.question, answer: input.answer },
        })
      } else {
        const last = await this.prisma.faq.findFirst({ orderBy: { sortOrder: "desc" } })
        await this.prisma.faq.create({
          data: { ...input, sortOrder: (last?.sortOrder ?? -1) + 1 },
        })
      }
    } catch (error) {
      if (prismaNotFound(error)) throw new NotFoundException("FAQ not found.")
      throw error
    }
    return { success: true }
  }

  async deleteFaq(id: number) {
    const row = await this.prisma.faq.delete({ where: { id } }).catch((error) => {
      if (prismaNotFound(error)) throw new NotFoundException("FAQ not found.")
      return null
    })
    if (!row) return { success: false, message: "FAQ not found." }
    await this.prisma.faq.updateMany({
      data: { sortOrder: { decrement: 1 } },
      where: { sortOrder: { gt: row.sortOrder } },
    })
    return { success: true }
  }

  async moveFaq(id: number, direction: "up" | "down") {
    const rows = await this.prisma.faq.findMany({ orderBy: { sortOrder: "asc" } })
    const index = rows.findIndex((r) => r.id === id)
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= rows.length) return { success: false }
    await this.prisma.$transaction([
      this.prisma.faq.update({ where: { id: rows[index].id }, data: { sortOrder: swapIndex } }),
      this.prisma.faq.update({ where: { id: rows[swapIndex].id }, data: { sortOrder: index } }),
    ])
    return { success: true }
  }

  async upsertTestimonial(input: {
    id?: number
    stars?: number
    tag?: string
    quote: string
    name: string
    role?: string
    avatar?: string
  }) {
    const data = {
      stars: Math.min(5, Math.max(1, Math.round(input.stars ?? 5))),
      tag: input.tag?.trim() || "",
      quote: input.quote,
      name: input.name,
      role: input.role?.trim() || "",
      avatar: input.avatar?.trim() || "",
    }
    if (input.id) {
      try {
        await this.prisma.testimonial.update({ where: { id: input.id }, data })
      } catch (error) {
        if (prismaNotFound(error)) throw new NotFoundException("Testimonial not found.")
        throw error
      }
    } else {
      const last = await this.prisma.testimonial.findFirst({ orderBy: { sortOrder: "desc" } })
      await this.prisma.testimonial.create({
        data: { ...data, sortOrder: (last?.sortOrder ?? -1) + 1 },
      })
    }
    return { success: true }
  }

  async deleteTestimonial(id: number) {
    const row = await this.prisma.testimonial.delete({ where: { id } }).catch((error) => {
      if (prismaNotFound(error)) throw new NotFoundException("Testimonial not found.")
      return null
    })
    if (!row) return { success: false, message: "Testimonial not found." }
    await this.prisma.testimonial.updateMany({
      data: { sortOrder: { decrement: 1 } },
      where: { sortOrder: { gt: row.sortOrder } },
    })
    return { success: true }
  }

  async moveTestimonial(id: number, direction: "up" | "down") {
    const rows = await this.prisma.testimonial.findMany({ orderBy: { sortOrder: "asc" } })
    const index = rows.findIndex((r) => r.id === id)
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (index < 0 || swapIndex < 0 || swapIndex >= rows.length) return { success: false }
    await this.prisma.$transaction([
      this.prisma.testimonial.update({ where: { id: rows[index].id }, data: { sortOrder: swapIndex } }),
      this.prisma.testimonial.update({ where: { id: rows[swapIndex].id }, data: { sortOrder: index } }),
    ])
    return { success: true }
  }
}
