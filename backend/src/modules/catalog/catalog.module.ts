import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PartnerBillingModule } from '../partner-billing/partner-billing.module';
import { CatalogService } from './catalog.service';
import { ListingMediaController } from './listing-media.controller';
import { ListingMediaService } from './listing-media.service';
import { MarketplaceController } from './marketplace.controller';
import { PartnerCatalogController } from './partner-catalog.controller';

import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';

@Module({
  imports: [IdentityModule, PartnerBillingModule],
  controllers: [
    PartnerCatalogController,
    MarketplaceController,
    ListingMediaController,
  ],
  providers: [CatalogService, ListingMediaService, VerifiedPartnerGuard],
  exports: [CatalogService],
})
export class CatalogModule {}
