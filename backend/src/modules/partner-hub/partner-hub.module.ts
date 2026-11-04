import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import { PartnerHubController } from './partner-hub.controller';
import { PartnerHubService } from './partner-hub.service';

@Module({
  imports: [IdentityModule],
  controllers: [PartnerHubController],
  providers: [PartnerHubService, VerifiedPartnerGuard],
  exports: [PartnerHubService],
})
export class PartnerHubModule {}
