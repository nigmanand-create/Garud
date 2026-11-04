import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { EnquiryIntent, EnquiryStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import {
  AssignEnquiryDto,
  BulkEnquiryStatusDto,
  UpdateEnquiryStatusDto,
} from './dto/enquiry.dto';
import { CrmExportService } from '../integrations/crm-export.service';
import { EnquiryService } from './enquiry.service';

@ApiTags('Admin')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('admin/enquiries')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class AdminEnquiriesController {
  constructor(
    private readonly enquiryService: EnquiryService,
    private readonly crmExport: CrmExportService,
  ) {}

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'CRM export: enquiries + routed partner lead as CSV (max 10,000 rows, newest first)',
  })
  @ApiQuery({ name: 'status', enum: EnquiryStatus, required: false })
  @ApiQuery({ name: 'intent', enum: EnquiryIntent, required: false })
  @ApiQuery({ name: 'routing', enum: ['ROUTED', 'UNROUTED'], required: false })
  @ApiQuery({ name: 'from', type: String, required: false })
  @ApiQuery({ name: 'to', type: String, required: false })
  async exportCsv(
    @Res({ passthrough: true }) res: Response,
    @Query('status') status?: EnquiryStatus,
    @Query('intent') intent?: EnquiryIntent,
    @Query('routing') routing?: 'ROUTED' | 'UNROUTED',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const parse = (v?: string) => {
      if (!v) return undefined;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    const { csv } = await this.crmExport.exportEnquiriesCsv({
      status: status && status in EnquiryStatus ? status : undefined,
      intent: intent && intent in EnquiryIntent ? intent : undefined,
      routing:
        routing === 'ROUTED' || routing === 'UNROUTED' ? routing : undefined,
      from: parse(from),
      to: parse(to),
    });
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="garudhub-enquiries-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    return csv;
  }

  @Get()
  @ApiOperation({ summary: 'List platform enquiries for admin triage' })
  @ApiQuery({ name: 'status', enum: EnquiryStatus, required: false })
  @ApiQuery({ name: 'intent', enum: EnquiryIntent, required: false })
  @ApiQuery({ name: 'routing', enum: ['ROUTED', 'UNROUTED'], required: false })
  @ApiQuery({ name: 'organizationId', type: String, required: false })
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  @ApiOkResponse({ description: 'Paginated enquiry list with status counts' })
  list(
    @Query('status') status?: EnquiryStatus,
    @Query('intent') intent?: EnquiryIntent,
    @Query('routing') routing?: 'ROUTED' | 'UNROUTED',
    @Query('organizationId') organizationId?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.enquiryService.listForAdmin({
      status: status && status in EnquiryStatus ? status : undefined,
      intent: intent && intent in EnquiryIntent ? intent : undefined,
      routing:
        routing === 'ROUTED' || routing === 'UNROUTED' ? routing : undefined,
      organizationId: organizationId || undefined,
      skip: skip != null ? Number(skip) : undefined,
      take: take != null ? Number(take) : undefined,
    });
  }

  @Post('bulk-status')
  @ApiOperation({ summary: 'Bulk update enquiry status' })
  bulkStatus(@Body() dto: BulkEnquiryStatusDto) {
    return this.enquiryService.bulkUpdateStatus(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update enquiry status (e.g. mark as read)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateEnquiryStatusDto) {
    return this.enquiryService.updateStatus(id, dto);
  }

  @Patch(':id/assign')
  @ApiOperation({
    summary:
      'Route enquiry to a verified partner (creates partner lead) or return to queue',
  })
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignEnquiryDto,
  ) {
    return this.enquiryService.assign(id, user.userId, dto);
  }
}
