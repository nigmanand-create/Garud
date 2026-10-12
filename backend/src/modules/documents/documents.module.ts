import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { DocumentsService } from './documents.service';
import { PartnerDocumentsController } from './partner-documents.controller';

@Module({
  imports: [IdentityModule],
  controllers: [PartnerDocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
