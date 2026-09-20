import { Module } from "@nestjs/common"

import { FulfillmentModule } from "../fulfillment/fulfillment.module"
import { Hotmail143Module } from "../hotmail143/hotmail143.module"
import { BulkMailModule } from "../bulkmail/bulkmail.module"
import { FxModule } from "../fx/fx.module"
import { SupportModule } from "../support/support.module"
import { NotificationsModule } from "../notifications/notifications.module"
import { AdminAuthController, AdminDataController } from "./admin.controller"
import { AdminService } from "./admin.service"

@Module({
  imports: [FulfillmentModule, Hotmail143Module, BulkMailModule, FxModule, SupportModule, NotificationsModule],
  controllers: [AdminAuthController, AdminDataController],
  providers: [AdminService],
})
export class AdminModule {}
