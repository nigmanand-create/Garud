import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import { BuyerAddressController } from './buyer-address.controller';
import { BuyerCartController } from './buyer-cart.controller';
import { BuyerCheckoutController } from './buyer-checkout.controller';
import { BuyerOrdersController } from './buyer-orders.controller';
import { PartnerOrdersController } from './partner-orders.controller';
import { BuyerAddressService } from './buyer-address.service';
import { CartService } from './cart.service';
import { CheckoutService } from './checkout.service';
import { OrdersService } from './orders.service';
import { BillingReceiptsModule } from '../../shared/billing/billing-receipts.module';

@Module({
  imports: [IdentityModule, NotificationsModule, BillingReceiptsModule],
  controllers: [
    BuyerAddressController,
    BuyerCartController,
    BuyerCheckoutController,
    BuyerOrdersController,
    PartnerOrdersController,
  ],
  providers: [
    BuyerAddressService,
    CartService,
    CheckoutService,
    OrdersService,
    VerifiedPartnerGuard,
  ],
})
export class CommerceModule {}
