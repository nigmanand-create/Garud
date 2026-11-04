import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { PartnerHubService } from './partner-hub.service';

@ApiTags('Partner Hub')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('partner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARTNER)
export class PartnerHubController {
  constructor(private readonly hub: PartnerHubService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Dashboard widget counts (RFQs, orders, leads, messages, ...)',
  })
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.hub.getOverview(user.userId);
  }

  @Get('analytics/export.csv')
  @UseGuards(VerifiedPartnerGuard)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Download analytics summary as CSV' })
  @ApiQuery({
    name: 'days',
    type: Number,
    required: false,
    description: '7–90, default 30',
  })
  async exportAnalyticsCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
    @Query('days') days?: string,
  ) {
    const { csv, filename } = await this.hub.exportAnalyticsCsv(
      user.userId,
      days ? parseInt(days, 10) : undefined,
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  }

  @Get('analytics')
  @UseGuards(VerifiedPartnerGuard)
  @ApiOperation({
    summary: 'Listing views, enquiry/lead funnel, RFQ and order performance',
  })
  @ApiQuery({
    name: 'days',
    type: Number,
    required: false,
    description: '7–90, default 30',
  })
  @ApiOkResponse({ description: 'Aggregated analytics for the period' })
  analytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('days') days?: string,
  ) {
    return this.hub.getAnalytics(
      user.userId,
      days ? parseInt(days, 10) : undefined,
    );
  }

  @Get('services')
  @UseGuards(VerifiedPartnerGuard)
  @ApiOperation({
    summary: 'Services hub: service listings, performance, service leads',
  })
  services(@CurrentUser() user: AuthenticatedUser) {
    return this.hub.getServicesHub(user.userId);
  }

  @Get('audit-log')
  @ApiOperation({
    summary: 'KYC and listing moderation events for your organization',
  })
  @ApiQuery({ name: 'take', type: Number, required: false })
  auditLog(
    @CurrentUser() user: AuthenticatedUser,
    @Query('take') take?: string,
  ) {
    return this.hub.getAuditLog(
      user.userId,
      take ? parseInt(take, 10) : undefined,
    );
  }
}
