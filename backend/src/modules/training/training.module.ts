import { Module } from '@nestjs/common';
import { EnquiriesModule } from '../enquiries/enquiries.module';
import { IdentityModule } from '../identity/identity.module';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import {
  PartnerTrainingController,
  PublicTrainingController,
} from './training.controllers';
import { TrainingService } from './training.service';

@Module({
  imports: [IdentityModule, EnquiriesModule],
  controllers: [PublicTrainingController, PartnerTrainingController],
  providers: [TrainingService, VerifiedPartnerGuard],
  exports: [TrainingService],
})
export class TrainingModule {}
