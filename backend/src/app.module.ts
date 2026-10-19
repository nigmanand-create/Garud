import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './shared/prisma/prisma.module';
import { IdentityModule } from './modules/identity/identity.module';
import { PartnerModule } from './modules/partner/partner.module';
import { AdminModule } from './modules/admin/admin.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { RfqModule } from './modules/rfq/rfq.module';
import { CommerceModule } from './modules/commerce/commerce.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    IdentityModule,
    DocumentsModule,
    PartnerModule,
    CatalogModule,
    RfqModule,
    CommerceModule,
    PaymentsModule,
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
