import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common"
import type { Response } from "express"

import { AdminGuard, ADMIN_COOKIE_NAME } from "../auth/admin.guard"
import { AdminService } from "./admin.service"
import {
  AdjustBalanceDto,
  AdminLoginDto,
  BulkMailCatalogQueryDto,
  BulkMailConfigDto,
  BulkMailExportQueryDto,
  BulkMailOrdersQueryDto,
  CreateCategoryDto,
  Hotmail143ConfigDto,
  ReplySupportMessageDto,
  UpdateCategoryDto,
  UpdateFxModeDto,
  UpsertProductDto,
} from "./dto/admin.dto"

@Controller("admin/auth")
export class AdminAuthController {
  constructor(private readonly admin: AdminService) {}

  @Post("login")
  async login(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.admin.login(dto.password)
    res.cookie(ADMIN_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12 * 1000, // 12 hours
    })
    return { success: result.success, message: result.message }
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ADMIN_COOKIE_NAME, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    })
    return this.admin.logout()
  }
}

@Controller("admin")
@UseGuards(AdminGuard)
export class AdminDataController {
  constructor(private readonly admin: AdminService) {}

  // --- Overview ---

  @Get("overview")
  overview() {
    return this.admin.getOverview()
  }

  // --- Products ---

  @Get("products")
  listProducts(@Query("section") section?: string) {
    if (section !== undefined && !section.trim()) {
      return this.admin.listProducts(undefined)
    }
    return this.admin.listProducts(section?.trim() || undefined)
  }

  @Post("products")
  upsertProduct(@Body() dto: UpsertProductDto) {
    return this.admin.upsertProduct(dto)
  }

  @Delete("products/:id")
  deleteProduct(@Param("id", ParseIntPipe) id: number) {
    return this.admin.deleteProduct(id)
  }

  // --- Users ---

  @Get("users")
  listUsers() {
    return this.admin.listUsers()
  }

  @Get("users/:id")
  getUser(@Param("id") userId: string) {
    if (!userId?.trim()) {
      throw new BadRequestException("User id is required.")
    }
    return this.admin.getUserDetails(userId.trim())
  }

  @Post("users/:id/balance")
  adjustBalance(
    @Param("id") userId: string,
    @Body() dto: AdjustBalanceDto,
  ) {
    return this.admin.adjustUserBalance(userId, dto.amount, dto.note)
  }

  @Delete("users/:id")
  deleteUser(@Param("id") userId: string) {
    return this.admin.deleteUser(userId)
  }

  // --- Live support chat (admin side) ---

  @Get("support/conversations")
  supportConversations() {
    return this.admin.listSupportConversations()
  }

  @Get("support/unread-count")
  supportUnreadCount() {
    return this.admin.getSupportUnreadCount()
  }

  @Get("support/messages")
  supportThread(@Query("userId") userId: string) {
    if (!userId?.trim()) {
      throw new BadRequestException("userId is required.")
    }
    return this.admin.getSupportThread(userId.trim())
  }

  @Post("support/messages")
  supportReply(@Body() dto: ReplySupportMessageDto) {
    return this.admin.replySupportMessage(dto.userId, dto.text)
  }

  // --- Orders / transactions / activity ---

  @Get("orders")
  listOrders(@Query("limit") limit?: string, @Query("offset") offset?: string) {
    const take = Math.min(500, Math.max(1, Number.parseInt(limit ?? "200", 10) || 200))
    const skip = Math.max(0, Number.parseInt(offset ?? "0", 10) || 0)
    return this.admin.listAllOrders(take, skip)
  }

  @Get("orders/attention-count")
  ordersAttentionCount() {
    return this.admin.getAttentionCount()
  }

  @Get("transactions")
  listTransactions(@Query("type") type?: string) {
    return this.admin.listAllTransactions(type)
  }

  @Get("activity")
  recentActivity(@Query("limit") limit?: string) {
    const parsed = Number.parseInt(limit ?? "", 10)
    const safe = Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 8
    return this.admin.getRecentActivity(safe)
  }

  // --- Hotmail143 integration ---

  @Post("orders/:id/complete")
  completeOrder(@Param("id", ParseIntPipe) id: number) {
    return this.admin.fulfillOrder(id)
  }

  @Get("hotmail143/balance")
  hotmail143Balance() {
    return this.admin.getHotmailBalance()
  }

  @Get("hotmail143/stock")
  hotmail143Stock() {
    return this.admin.getHotmailStock()
  }

  @Get("hotmail143/products")
  hotmail143Products() {
    return this.admin.getHotmailProducts()
  }

  @Post("hotmail143/config")
  updateHotmail143Config(@Body() dto: Hotmail143ConfigDto) {
    return this.admin.updateHotmailConfig(dto)
  }

  // --- BulkMail integration (mirrors Hotmail143) ------------------------------

  @Get("bulkmail/balance")
  bulkmailBalance() {
    return this.admin.getBulkmailBalance()
  }

  @Get("bulkmail/stock")
  bulkmailStock() {
    return this.admin.getBulkmailStock()
  }

  @Get("bulkmail/products")
  bulkmailProducts() {
    return this.admin.getBulkmailProducts()
  }

  @Get("bulkmail/catalog")
  bulkmailCatalog(@Query() query: BulkMailCatalogQueryDto) {
    return this.admin.getBulkmailCatalog({
      page: query.page,
      perPage: query.perPage,
      search: query.search?.trim() || undefined,
      inStock: query.inStock,
      sort: query.sort,
      order: query.order,
    })
  }

  @Get("bulkmail/catalog/:id")
  bulkmailCatalogProduct(@Param("id", ParseIntPipe) id: number) {
    return this.admin.getBulkmailCatalogProduct(id)
  }

  // --- BulkMail supplier orders (purchase facility) ----------------------------

  @Get("bulkmail/orders")
  bulkmailOrders(@Query() query: BulkMailOrdersQueryDto) {
    return this.admin.listBulkmailOrders({
      page: query.page,
      perPage: query.perPage,
      status: query.status,
    })
  }

  @Get("bulkmail/orders/:id/export")
  bulkmailExportOrder(
    @Param("id", ParseIntPipe) id: number,
    @Query() query: BulkMailExportQueryDto,
  ) {
    const format = (query.format ?? "txt") as "txt" | "csv" | "json"
    return this.admin.exportBulkmailOrder(id, format)
  }

  @Get("bulkmail/orders/:id")
  bulkmailOrder(@Param("id", ParseIntPipe) id: number) {
    return this.admin.getBulkmailOrder(id)
  }

  @Post("bulkmail/orders/:id/cancel")
  cancelBulkmailOrder(@Param("id", ParseIntPipe) id: number) {
    return this.admin.cancelBulkmailOrder(id)
  }

  @Post("bulkmail/config")
  updateBulkmailConfig(@Body() dto: BulkMailConfigDto) {
    return this.admin.updateBulkmailConfig(dto)
  }

  // --- FX rate (live USD → local, manual setting as fallback) -----------------

  @Get("fx/rate")
  fxRate() {
    return this.admin.getFxRate()
  }

  @Post("fx/mode")
  updateFxMode(@Body() dto: UpdateFxModeDto) {
    return this.admin.updateFxMode(dto.live)
  }

  // --- Categories -------------------------------------------------------------

  @Get("categories")
  listCategories() {
    return this.admin.listCategories()
  }

  @Post("categories")
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.admin.createCategory(dto.name)
  }

  @Put("categories/:id")
  updateCategory(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.admin.updateCategory(id, dto)
  }

  @Delete("categories/:id")
  deleteCategory(@Param("id", ParseIntPipe) id: number) {
    return this.admin.deleteCategory(id)
  }
}
