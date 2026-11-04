import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { LeadStatus, UserRole } from '@prisma/client';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { AdminAuditService, parseAuditKinds } from './admin-audit.service';
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
  ) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Operations home: pending KYC / listings / enquiries / leads / partnerships counts + recent activity',
  })
  getOverview() {
    return this.overview.overview();
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

  @Get('leads')
  @ApiOperation({
    summary: 'Read-only oversight of partner leads (routed enquiries)',
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
