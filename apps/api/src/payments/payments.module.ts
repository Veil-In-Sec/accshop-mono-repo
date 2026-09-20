import { Module } from "@nestjs/common"

import {
  AdminPaymentsController,
  PaymentsController,
} from "./payments.controller"
import { PaymentsService } from "./payments.service"

@Module({
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
