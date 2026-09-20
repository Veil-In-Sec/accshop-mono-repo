import { Module } from "@nestjs/common"

import { Hotmail143Module } from "../hotmail143/hotmail143.module"
import { BulkMailModule } from "../bulkmail/bulkmail.module"
import { FxModule } from "../fx/fx.module"
import { NotificationsModule } from "../notifications/notifications.module"
import { FulfillmentService } from "./fulfillment.service"

@Module({
  imports: [Hotmail143Module, BulkMailModule, FxModule, NotificationsModule],
  providers: [FulfillmentService],
  exports: [FulfillmentService],
})
export class FulfillmentModule {}
