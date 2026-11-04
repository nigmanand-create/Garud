import { Controller, Get, Header, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { OrdersService } from './orders.service';
import { BillingReceiptsService } from '../../shared/billing/billing-receipts.service';

@ApiTags('Buyer orders')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('buyer/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER, UserRole.GOVERNMENT)
export class BuyerOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly receipts: BillingReceiptsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List your orders' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.listBuyerOrders(user.userId);
  }

  @Get(':id/receipt.html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({
    summary:
      'HTML payment receipt stub (paid orders; not a statutory GST invoice)',
  })
  receipt(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.receipts.orderReceiptHtml(user.userId, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Order detail' })
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.getBuyerOrder(user.userId, id);
  }
}
