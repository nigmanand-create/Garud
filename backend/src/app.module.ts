import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { throttleLimit, throttleTtl } from './config/throttle.config';
import { RequestIdMiddleware } from './shared/logging/request-id.middleware';
import { IntegrationsModule } from './modules/integrations/integrations.module';
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
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EnquiriesModule } from './modules/enquiries/enquiries.module';
import { PartnerHubModule } from './modules/partner-hub/partner-hub.module';
import { PartnershipsModule } from './modules/partnerships/partnerships.module';
import { MessagesModule } from './modules/messages/messages.module';
import { PartnerBillingModule } from './modules/partner-billing/partner-billing.module';
import { ServiceRequestsModule } from './modules/service-requests/service-requests.module';
import { TrainingModule } from './modules/training/training.module';
import { GovModule } from './modules/gov/gov.module';
import { UploadStorageModule } from './shared/storage/upload-storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: () => throttleTtl('global'),
          limit: () => throttleLimit('global'),
        },
      ],
    }),
    PrismaModule,
    UploadStorageModule,
    NotificationsModule,
    IntegrationsModule,
    IdentityModule,
    DocumentsModule,
    PartnerModule,
    CatalogModule,
    RfqModule,
    CommerceModule,
    PaymentsModule,
    AdminModule,
    EnquiriesModule,
    PartnerHubModule,
    PartnershipsModule,
    MessagesModule,
    PartnerBillingModule,
    ServiceRequestsModule,
    TrainingModule,
    GovModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PublicPostThrottleGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }
}
