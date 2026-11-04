import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { EnquiryService } from './enquiry.service';

@ApiTags('Admin')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('admin/enquiries')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class AdminEnquiriesController {
  constructor(private readonly enquiryService: EnquiryService) {}

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
