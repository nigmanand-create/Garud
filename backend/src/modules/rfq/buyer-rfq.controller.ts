import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { CreateRfqDto } from './dto/rfq.dto';
import { RfqService } from './rfq.service';

@ApiTags('RFQ (Buyer)')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('rfq')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER, UserRole.GOVERNMENT)
export class BuyerRfqController {
  constructor(private readonly rfqService: RfqService) {}

  @Post()
  @ApiOperation({ summary: 'Post a requirement (matches verified vendors)' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRfqDto) {
    return this.rfqService.createRfq(user.userId, user.role, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List your RFQs' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.rfqService.listBuyerRfqs(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'RFQ detail' })
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rfqService.getBuyerRfq(user.userId, id);
  }

  @Get(':id/quotations')
  @ApiOperation({
    summary: 'Compare vendor quotations (includes contact details)',
  })
  compare(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rfqService.compareQuotations(user.userId, id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close RFQ after selecting a vendor' })
  close(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rfqService.closeRfq(user.userId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an open RFQ' })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rfqService.cancelRfq(user.userId, id);
  }
}
