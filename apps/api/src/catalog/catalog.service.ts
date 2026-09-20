import { Injectable } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.module"

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Active category names shown as tabs in the customer dashboard. */
  async getCategories(): Promise<string[]> {
    const rows = await this.prisma.category.findMany({
      where: { active: true },
      select: { name: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    })
    return rows.map((r) => r.name)
  }

  /** Active catalog products grouped by category for the customer dashboard. */
  async getProducts() {
    const rows = await this.prisma.product.findMany({
      where: { active: true, section: "catalog" },
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        price: true,
        originalPrice: true,
        stock: true,
        badge: true,
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    })
    return rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      price: Number(p.price),
      originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
      stock: p.stock,
      badge: p.badge ?? undefined,
    }))
  }
}
