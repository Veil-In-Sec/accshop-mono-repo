import { Module } from "@nestjs/common"

import { BulkMailService } from "./bulkmail.service"

@Module({
  providers: [BulkMailService],
  exports: [BulkMailService],
})
export class BulkMailModule {}
