import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"

import { PrismaModule } from "./prisma/prisma.module"
import { AuthModule } from "./auth/auth.module"
import { HealthController } from "./health/health.controller"
import { SettingsModule } from "./settings/settings.module"
import { ContentModule } from "./content/content.module"
import { CatalogModule } from "./catalog/catalog.module"
import { PaymentsModule } from "./payments/payments.module"
import { DepositsModule } from "./deposits/deposits.module"
import { WalletModule } from "./wallet/wallet.module"
import { FulfillmentModule } from "./fulfillment/fulfillment.module"
import { SupportModule } from "./support/support.module"
import { NotificationsModule } from "./notifications/notifications.module"
import { VerificationCodesModule } from "./verification-codes/verification-codes.module"
import { TotpModule } from "./totp/totp.module"
import { AdminModule } from "./admin/admin.module"
import { BulkMailModule } from "./bulkmail/bulkmail.module"
import { FxModule } from "./fx/fx.module"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SettingsModule,
    ContentModule,
    CatalogModule,
    PaymentsModule,
    DepositsModule,
    WalletModule,
    FulfillmentModule,
    SupportModule,
    NotificationsModule,
    VerificationCodesModule,
    TotpModule,
    AdminModule,
    BulkMailModule,
    FxModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
