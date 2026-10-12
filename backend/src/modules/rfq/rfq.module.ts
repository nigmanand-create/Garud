import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import { BuyerRfqController } from './buyer-rfq.controller';
import { PartnerRfqController } from './partner-rfq.controller';
import { RfqMatchingService } from './rfq-matching.service';
import { RfqService } from './rfq.service';

@Module({
  imports: [IdentityModule],
  controllers: [BuyerRfqController, PartnerRfqController],
  providers: [RfqService, RfqMatchingService, VerifiedPartnerGuard],
  exports: [RfqService],
})
export class RfqModule {}
