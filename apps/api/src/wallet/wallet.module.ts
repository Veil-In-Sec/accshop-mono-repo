import { Module } from "@nestjs/common"

import { FulfillmentModule } from "../fulfillment/fulfillment.module"
import { NotificationsModule } from "../notifications/notifications.module"
import { WalletController } from "./wallet.controller"
import { WalletService } from "./wallet.service"

@Module({
  imports: [FulfillmentModule, NotificationsModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
