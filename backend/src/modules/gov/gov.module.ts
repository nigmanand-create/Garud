import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { BuyerGovController } from './buyer-gov.controller';
import { AdminGovController, PublicGovController } from './gov.controllers';
import { GovBidDocumentService } from './gov-bid-document.service';
import { GovService } from './gov.service';

@Module({
  imports: [IdentityModule],
  controllers: [PublicGovController, AdminGovController, BuyerGovController],
  providers: [GovService, GovBidDocumentService],
  exports: [GovService],
})
export class GovModule {}
