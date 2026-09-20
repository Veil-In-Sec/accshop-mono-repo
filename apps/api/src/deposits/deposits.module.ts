import { Module } from "@nestjs/common"

import { WalletModule } from "../wallet/wallet.module"
import { AdminDepositsController, DepositsController } from "./deposits.controller"
import { DepositsService } from "./deposits.service"

@Module({
  imports: [WalletModule],
  controllers: [DepositsController, AdminDepositsController],
  providers: [DepositsService],
})
export class DepositsModule {}
