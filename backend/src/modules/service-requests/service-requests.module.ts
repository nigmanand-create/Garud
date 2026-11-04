import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import {
  AdminServiceRequestsController,
  BuyerServiceRequestsController,
  PartnerServiceRequestsController,
  ServiceRequestTrackingController,
} from './service-requests.controllers';
import { ServiceRequestsService } from './service-requests.service';

/**
 * C8 service matching. The public submit endpoint (`POST /service-requests`) lives in
 * `EnquiriesModule` because every submission also creates the linked enquiry / lead.
 */
@Module({
  imports: [IdentityModule],
  controllers: [
    ServiceRequestTrackingController,
    BuyerServiceRequestsController,
    PartnerServiceRequestsController,
    AdminServiceRequestsController,
  ],
  providers: [ServiceRequestsService, VerifiedPartnerGuard],
  exports: [ServiceRequestsService],
})
export class ServiceRequestsModule {}
