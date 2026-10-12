import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import { UpdateOrderFulfillmentDto } from './dto/update-fulfillment.dto';
import { OrdersService } from './orders.service';

@ApiTags('Partner orders')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('partner/orders')
@UseGuards(JwtAuthGuard, RolesGuard, VerifiedPartnerGuard)
@Roles(UserRole.PARTNER)
export class PartnerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Incoming orders for your organization' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.listPartnerOrders(user.userId);
  }

  @Patch(':id/fulfillment')
  @ApiOperation({ summary: 'Update order fulfillment status' })
  updateFulfillment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderFulfillmentDto,
  ) {
    return this.ordersService.updatePartnerOrderFulfillment(
      user.userId,
      id,
      dto.fulfillmentStatus,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Order detail (your organization only)' })
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.getPartnerOrder(user.userId, id);
  }
}
