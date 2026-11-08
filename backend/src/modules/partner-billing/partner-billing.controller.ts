import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import { CheckoutPlanDto, VerifySubscriptionDto } from './dto/billing.dto';
import { PartnerBillingService } from './partner-billing.service';
import { BillingReceiptsService } from '../../shared/billing/billing-receipts.service';

@ApiTags('Partner Billing')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('partner/subscription')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARTNER)
export class PartnerBillingController {
  constructor(
    private readonly billing: PartnerBillingService,
    private readonly receipts: BillingReceiptsService,
  ) {}

  @Get('receipt.html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({
    summary:
      'HTML GST receipt for paid partner subscription (SAC, intra/inter-state GST split; requires GARUD_PLATFORM_GSTIN)',
  })
  receipt(@CurrentUser() user: AuthenticatedUser) {
    return this.receipts.subscriptionReceiptHtml(user.userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Current plan, entitlements, usage and available plans',
  })
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.getSubscription(user.userId);
  }

  @Post('checkout')
  @HttpCode(200)
  @UseGuards(VerifiedPartnerGuard)
  @ApiOperation({
    summary:
      'Switch plan: free plans activate immediately, paid plans return a Razorpay subscription to authorise',
  })
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutPlanDto,
  ) {
    return this.billing.checkout(user.userId, dto.planKey);
  }

  @Post('verify')
  @HttpCode(200)
  @UseGuards(VerifiedPartnerGuard)
  @ApiOperation({
    summary: 'Verify the Razorpay subscription payment signature',
  })
  verify(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifySubscriptionDto,
  ) {
    return this.billing.verifyCheckout(user.userId, dto);
  }

  @Post('cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel at the end of the current paid period' })
  cancel(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.cancel(user.userId);
  }
}
