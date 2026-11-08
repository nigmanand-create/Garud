import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { EnquiriesModule } from '../enquiries/enquiries.module';
import { IdentityModule } from '../identity/identity.module';
import { PartnerBillingModule } from '../partner-billing/partner-billing.module';
import { AdminBillingController } from './admin-billing.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminController } from './admin.controller';
import { AdminOpsController } from './admin-ops.controller';
import { AdminOverviewService } from './admin-overview.service';
import { AdminService } from './admin.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [IdentityModule, DocumentsModule, PartnerBillingModule, EnquiriesModule],
  controllers: [
    AdminController,
    AdminOpsController,
    AdminUsersController,
    AdminBillingController,
  ],
  providers: [
    AdminService,
    AdminAuditService,
    AdminOverviewService,
    AdminAnalyticsService,
    AdminUsersService,
  ],
})
export class AdminModule {}
