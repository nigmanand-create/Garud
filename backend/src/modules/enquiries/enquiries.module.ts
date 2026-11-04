import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ServiceRequestsModule } from '../service-requests/service-requests.module';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import { AdminEnquiriesController } from './admin-enquiries.controller';
import { EnquiriesController } from './enquiries.controller';
import { EnquiryService } from './enquiry.service';
import { ServiceIntakeController } from './service-intake.controller';
import { LeadService } from './lead.service';
import {
  PartnerEnquiriesController,
  PartnerLeadsController,
} from './partner-leads.controller';

@Module({
  imports: [IdentityModule, ServiceRequestsModule],
  controllers: [
    EnquiriesController,
    AdminEnquiriesController,
    PartnerLeadsController,
    PartnerEnquiriesController,
    ServiceIntakeController,
  ],
  providers: [EnquiryService, LeadService, VerifiedPartnerGuard],
  exports: [EnquiryService, LeadService],
})
export class EnquiriesModule {}
