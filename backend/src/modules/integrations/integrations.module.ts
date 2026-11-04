import { Global, Module } from '@nestjs/common';
import { CrmExportService } from './crm-export.service';
import { CrmWebhookService } from './crm-webhook.service';

@Global()
@Module({
  providers: [CrmWebhookService, CrmExportService],
  exports: [CrmWebhookService, CrmExportService],
})
export class IntegrationsModule {}
