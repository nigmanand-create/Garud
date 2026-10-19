import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/commerce.dto';

@ApiTags('Buyer cart')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('buyer/cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER, UserRole.GOVERNMENT)
export class BuyerCartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current cart' })
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.getCart(user.userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add listing to cart' })
  addItem(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.userId, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update line quantity' })
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.userId, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove line from cart' })
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeItem(user.userId, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  clear(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.clearCart(user.userId);
  }
}
