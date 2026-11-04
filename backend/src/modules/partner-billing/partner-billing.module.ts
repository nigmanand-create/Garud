import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { IdentityModule } from '../identity/identity.module';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import { PartnerBillingController } from './partner-billing.controller';
import { PartnerBillingService } from './partner-billing.service';
import { BillingReceiptsModule } from '../../shared/billing/billing-receipts.module';

@Module({
  imports: [PrismaModule, IdentityModule, BillingReceiptsModule],
  controllers: [PartnerBillingController],
  providers: [PartnerBillingService, VerifiedPartnerGuard],
  exports: [PartnerBillingService],
})
export class PartnerBillingModule {}
