import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { AdminGovController, PublicGovController } from './gov.controllers';
import { GovService } from './gov.service';

@Module({
  imports: [IdentityModule],
  controllers: [PublicGovController, AdminGovController],
  providers: [GovService],
  exports: [GovService],
})
export class GovModule {}
