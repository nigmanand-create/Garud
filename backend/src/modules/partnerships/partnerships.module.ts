import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import { AdminPartnershipsController } from './admin-partnerships.controller';
import { PartnerPartnershipsController } from './partner-partnerships.controller';
import { PartnershipsService } from './partnerships.service';

@Module({
  imports: [IdentityModule, NotificationsModule],
  controllers: [PartnerPartnershipsController, AdminPartnershipsController],
  providers: [PartnershipsService, VerifiedPartnerGuard],
  exports: [PartnershipsService],
})
export class PartnershipsModule {}
