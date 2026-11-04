import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  EnquiryIntent,
  EnquiryStatus,
  LeadStatus,
  UserRole,
} from '@prisma/client';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { UpdateEnquiryStatusDto, UpdateLeadDto } from './dto/enquiry.dto';
import { EnquiryService } from './enquiry.service';
import { LeadService } from './lead.service';

@ApiTags('Leads (Partner)')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('partner/leads')
@UseGuards(JwtAuthGuard, RolesGuard, VerifiedPartnerGuard)
@Roles(UserRole.PARTNER)
export class PartnerLeadsController {
  constructor(private readonly leadService: LeadService) {}

  @Get()
  @ApiOperation({
    summary:
      'Enquiry leads routed to your organization (listing / partner / admin assigned)',
  })
  @ApiQuery({ name: 'status', enum: LeadStatus, required: false })
  @ApiQuery({ name: 'intent', enum: EnquiryIntent, required: false })
  @ApiQuery({ name: 'q', type: String, required: false })
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: LeadStatus,
    @Query('intent') intent?: EnquiryIntent,
    @Query('q') q?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.leadService.listForPartner(user.userId, {
      status: status && status in LeadStatus ? status : undefined,
      intent: intent && intent in EnquiryIntent ? intent : undefined,
      q: q?.slice(0, 100),
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lead status or private note' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadService.updateForPartner(user.userId, id, dto);
  }
}

@ApiTags('Enquiries (Partner)')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('partner/enquiries')
@UseGuards(JwtAuthGuard, RolesGuard, VerifiedPartnerGuard)
@Roles(UserRole.PARTNER)
export class PartnerEnquiriesController {
  constructor(private readonly enquiryService: EnquiryService) {}

  @Get()
  @ApiOperation({ summary: 'Enquiry inbox routed to your organization' })
  @ApiQuery({ name: 'status', enum: EnquiryStatus, required: false })
  @ApiQuery({ name: 'q', type: String, required: false })
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: EnquiryStatus,
    @Query('q') q?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.enquiryService.listForPartner(user.userId, {
      status: status && status in EnquiryStatus ? status : undefined,
      q: q?.slice(0, 100),
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mark an enquiry new / read / closed' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEnquiryStatusDto,
  ) {
    return this.enquiryService.updateStatusForPartner(user.userId, id, dto);
  }
}
