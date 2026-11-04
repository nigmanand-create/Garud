import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { CreatePartnershipRequestDto } from './dto/partnership.dto';
import { PartnershipsService } from './partnerships.service';

@ApiTags('Partnerships (Partner)')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('partner/partnerships')
@UseGuards(JwtAuthGuard, RolesGuard, VerifiedPartnerGuard)
@Roles(UserRole.PARTNER)
export class PartnerPartnershipsController {
  constructor(private readonly partnerships: PartnershipsService) {}

  @Get()
  @ApiOperation({
    summary: 'Your partnership requests and approved incoming partners',
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.partnerships.listForPartner(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Submit a partnership request for admin review' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePartnershipRequestDto,
  ) {
    return this.partnerships.create(user.userId, dto);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Withdraw an open partnership request' })
  withdraw(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.partnerships.withdraw(user.userId, id);
  }
}
