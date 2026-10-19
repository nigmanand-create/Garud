import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { CheckoutService } from './checkout.service';
import { PlaceCheckoutDto } from './dto/commerce.dto';

@ApiTags('Buyer checkout')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('buyer/checkout')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER, UserRole.GOVERNMENT)
export class BuyerCheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get('saved-address')
  @ApiOperation({
    summary: 'Get buyer default saved address from profile or previous order',
  })
  getSavedAddress(@CurrentUser() user: AuthenticatedUser) {
    return this.checkoutService.getSavedAddress(user.userId);
  }

  @Post('place')
  @ApiOperation({ summary: 'Place order from cart (pay later / offline)' })
  place(@CurrentUser() user: AuthenticatedUser, @Body() dto: PlaceCheckoutDto) {
    return this.checkoutService.placeOrder(user.userId, user.role, dto);
  }
}
