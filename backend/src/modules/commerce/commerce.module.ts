import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import { BuyerCartController } from './buyer-cart.controller';
import { BuyerCheckoutController } from './buyer-checkout.controller';
import { BuyerOrdersController } from './buyer-orders.controller';
import { PartnerOrdersController } from './partner-orders.controller';
import { CartService } from './cart.service';
import { CheckoutService } from './checkout.service';
import { OrdersService } from './orders.service';
import { BillingReceiptsModule } from '../../shared/billing/billing-receipts.module';

@Module({
  imports: [IdentityModule, NotificationsModule, BillingReceiptsModule],
  controllers: [
    BuyerCartController,
    BuyerCheckoutController,
    BuyerOrdersController,
    PartnerOrdersController,
  ],
  providers: [
    CartService,
    CheckoutService,
    OrdersService,
    VerifiedPartnerGuard,
  ],
})
export class CommerceModule {}
