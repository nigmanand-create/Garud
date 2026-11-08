import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { LeadStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { AdminUpdateLeadDto } from '../enquiries/dto/enquiry.dto';
import { AdminAuditService, parseAuditKinds } from './admin-audit.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminOverviewService } from './admin-overview.service';

function parseDate(raw?: string): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseIntOrUndefined(raw?: string): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? undefined : n;
}

/** Admin operations home: overview counts, global audit log, partner leads oversight. */
@ApiTags('Admin')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class AdminOpsController {
  constructor(
    private readonly overview: AdminOverviewService,
    private readonly audit: AdminAuditService,
    private readonly analytics: AdminAnalyticsService,
  ) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Operations home: pending KYC / listings / enquiries / leads / partnerships counts + recent activity',
  })
  getOverview() {
    return this.overview.overview();
  }

  @Get('analytics')
  @ApiOperation({
    summary:
      'Commerce analytics: GMV trend, order mix, top vendors and the RFQ → quote → order funnel',
  })
  @ApiQuery({
    name: 'days',
    type: Number,
    required: false,
    description: '7–365, default 30',
  })
  commerceAnalytics(@Query('days') days?: string) {
    return this.analytics.commerceAnalytics(parseIntOrUndefined(days));
  }

  @Get('audit-log/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Export filtered audit events as CSV (same filters as audit log list, max 10,000 rows)',
  })
  @ApiQuery({
    name: 'kind',
    required: false,
    description: 'Comma list of KYC,LISTING,PARTNERSHIP,ENQUIRY,USER',
  })
  @ApiQuery({ name: 'actorUserId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date' })
  async exportAuditCsv(
    @Res({ passthrough: true }) res: Response,
    @Query('kind') kind?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const toDate = parseDate(to);
    if (toDate && to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      toDate.setUTCHours(23, 59, 59, 999);
    }
    const { csv, filename } = await this.audit.exportCsv({
      kinds: parseAuditKinds(kind),
      actorUserId: actorUserId || undefined,
      search,
      from: parseDate(from),
      to: toDate,
    });
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  }

  @Get('audit-log')
  @ApiOperation({
    summary:
      'Global audit log (KYC, listing moderation, partnership decisions, enquiry routing, admin user changes)',
  })
  @ApiQuery({
    name: 'kind',
    required: false,
    description: 'Comma list of KYC,LISTING,PARTNERSHIP,ENQUIRY,USER',
  })
  @ApiQuery({ name: 'actorUserId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  @ApiOkResponse({ description: 'Paginated events + per-kind counts' })
  auditLog(
    @Query('kind') kind?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const toDate = parseDate(to);
    // A bare YYYY-MM-DD "to" should include that whole day.
    if (toDate && to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      toDate.setUTCHours(23, 59, 59, 999);
    }
    return this.audit.list({
      kinds: parseAuditKinds(kind),
      actorUserId: actorUserId || undefined,
      search,
      from: parseDate(from),
      to: toDate,
      skip: parseIntOrUndefined(skip),
      take: parseIntOrUndefined(take),
    });
  }

  @Patch('leads/:id')
  @ApiOperation({
    summary:
      'Update partner lead status / note or reroute to another verified partner',
  })
  @ApiParam({ name: 'id', description: 'Lead id' })
  updateLead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AdminUpdateLeadDto,
  ) {
    return this.overview.updateLead(id, user.userId, dto);
  }

  @Get('leads')
  @ApiOperation({
    summary: 'Partner leads oversight (routed enquiries)',
  })
  @ApiQuery({ name: 'status', enum: LeadStatus, required: false })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({
    name: 'stale',
    required: false,
    description: '"true" = NEW and untouched',
  })
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  leads(
    @Query('status') status?: LeadStatus,
    @Query('organizationId') organizationId?: string,
    @Query('stale') stale?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.overview.listLeads({
      status: status && status in LeadStatus ? status : undefined,
      organizationId: organizationId || undefined,
      stale: stale === 'true',
      skip: parseIntOrUndefined(skip),
      take: parseIntOrUndefined(take),
    });
  }
}
