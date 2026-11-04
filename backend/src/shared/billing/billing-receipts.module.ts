import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingReceiptsService } from './billing-receipts.service';

@Module({
  imports: [PrismaModule],
  providers: [BillingReceiptsService],
  exports: [BillingReceiptsService],
})
export class BillingReceiptsModule {}
