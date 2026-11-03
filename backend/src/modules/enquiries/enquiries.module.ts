import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { AdminEnquiriesController } from './admin-enquiries.controller';
import { EnquiriesController } from './enquiries.controller';
import { EnquiryService } from './enquiry.service';

@Module({
  imports: [IdentityModule],
  controllers: [EnquiriesController, AdminEnquiriesController],
  providers: [EnquiryService],
  exports: [EnquiryService],
})
export class EnquiriesModule {}
