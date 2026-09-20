import { Controller, Get } from "@nestjs/common"

import { CatalogService } from "./catalog.service"

@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  /** Active category names for the customer dashboard. No auth required. */
  @Get("categories")
  categories() {
    return this.catalog.getCategories()
  }

  /** Active catalog products for the customer dashboard. No auth required. */
  @Get("products")
  products() {
    return this.catalog.getProducts()
  }
}
