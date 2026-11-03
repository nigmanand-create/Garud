import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { AppController } from './app.controller';
import { PublicPostThrottleGuard } from './shared/guards/public-post-throttle.guard';
import { PrismaModule } from './shared/prisma/prisma.module';
import { IdentityModule } from './modules/identity/identity.module';
import { PartnerModule } from './modules/partner/partner.module';
import { AdminModule } from './modules/admin/admin.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { RfqModule } from './modules/rfq/rfq.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { EnquiriesModule } from './modules/enquiries/enquiries.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
    }),
    PrismaModule,
    IdentityModule,
    DocumentsModule,
    PartnerModule,
    CatalogModule,
    RfqModule,
    CommerceModule,
    PaymentsModule,
    AdminModule,
    EnquiriesModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PublicPostThrottleGuard,
    },
  ],
})
export class AppModule {}
