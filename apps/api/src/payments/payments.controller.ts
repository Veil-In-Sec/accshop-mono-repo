import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common"

import { AdminGuard } from "../auth/admin.guard"
import { PaymentsService } from "./payments.service"
import { UpsertPaymentMethodDto } from "./dto/payment-method.dto"

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get("methods")
  listEnabled() {
    return this.payments.listEnabled()
  }
}

@Controller("admin/payment-methods")
@UseGuards(AdminGuard)
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  listAll() {
    return this.payments.listAll()
  }

  @Post()
  upsert(@Body() dto: UpsertPaymentMethodDto) {
    return this.payments.upsert(dto)
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.payments.remove(id)
  }
}
