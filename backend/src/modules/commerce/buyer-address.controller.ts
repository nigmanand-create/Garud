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
import { BuyerAddressService } from './buyer-address.service';
import {
  CreateBuyerAddressDto,
  UpdateBuyerAddressDto,
} from './dto/buyer-address.dto';

@ApiTags('Buyer addresses')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('buyer/addresses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER, UserRole.GOVERNMENT)
export class BuyerAddressController {
  constructor(private readonly buyerAddressService: BuyerAddressService) {}

  @Get()
  @ApiOperation({ summary: 'List saved shipping addresses' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.buyerAddressService.list(user.userId, user.role);
  }

  @Post()
  @ApiOperation({ summary: 'Create a saved shipping address' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBuyerAddressDto,
  ) {
    return this.buyerAddressService.create(user.userId, user.role, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a saved address' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBuyerAddressDto,
  ) {
    return this.buyerAddressService.update(user.userId, user.role, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a saved address' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.buyerAddressService.remove(user.userId, user.role, id);
  }

  @Post(':id/set-default')
  @ApiOperation({ summary: 'Set address as default for checkout' })
  setDefault(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.buyerAddressService.setDefault(user.userId, user.role, id);
  }
}
