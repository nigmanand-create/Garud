import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
  ServiceRequestCategory,
  ServiceRequestStatus,
  UserRole,
} from '@prisma/client';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import {
  AdminAssignServiceRequestDto,
  AdminServiceRequestStatusDto,
  PartnerServiceRequestUpdateDto,
  ServiceCoverageDto,
} from './dto/service-request.dto';
import { ServiceRequestsService } from './service-requests.service';

/** Public tracking by unguessable token (the link emailed to the requester). */
@ApiTags('Service requests')
@Controller('service-requests')
export class ServiceRequestTrackingController {
  constructor(private readonly service: ServiceRequestsService) {}

  @Get('track/:token')
  @ApiOperation({ summary: 'Track a service request by its tracking token' })
  track(@Param('token') token: string) {
    return this.service.getByToken(token);
  }

  @Post('track/:token/cancel')
  @ApiOperation({ summary: 'Requester cancels an open request' })
  cancel(@Param('token') token: string) {
    return this.service.cancelByToken(token);
  }
}

@ApiTags('Service requests')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('buyer/service-requests')
@UseGuards(JwtAuthGuard)
export class BuyerServiceRequestsController {
  constructor(private readonly service: ServiceRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Service requests submitted while signed in' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listForBuyer(user.userId);
  }
}

@ApiTags('Service requests (Partner)')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('partner/service-requests')
@UseGuards(JwtAuthGuard, RolesGuard, VerifiedPartnerGuard)
@Roles(UserRole.PARTNER)
export class PartnerServiceRequestsController {
  constructor(private readonly service: ServiceRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Matched service requests (inbox)' })
  @ApiQuery({
    name: 'tab',
    enum: ['OFFERED', 'ACTIVE', 'CLOSED'],
    required: false,
  })
  list(@CurrentUser() user: AuthenticatedUser, @Query('tab') tab?: string) {
    return this.service.listForPartner(user.userId, {
      tab:
        tab === 'OFFERED' || tab === 'ACTIVE' || tab === 'CLOSED'
          ? tab
          : undefined,
    });
  }

  @Get('coverage')
  @ApiOperation({
    summary: 'Service categories + states you take requests for',
  })
  coverage(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getCoverage(user.userId);
  }

  @Put('coverage')
  @ApiOperation({ summary: 'Update service categories + states for matching' })
  updateCoverage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ServiceCoverageDto,
  ) {
    return this.service.updateCoverage(user.userId, dto);
  }

  @Post(':id/accept')
  @ApiOperation({
    summary: 'Accept a matched request (connects you to the requester)',
  })
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.accept(user.userId, id);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline a matched request' })
  decline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.decline(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Add a progress note or mark the job completed' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PartnerServiceRequestUpdateDto,
  ) {
    return this.service.partnerUpdate(user.userId, id, dto);
  }
}

@ApiTags('Admin')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('admin/service-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class AdminServiceRequestsController {
  constructor(private readonly service: ServiceRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'All service requests with match state' })
  @ApiQuery({ name: 'status', enum: ServiceRequestStatus, required: false })
  @ApiQuery({ name: 'category', enum: ServiceRequestCategory, required: false })
  @ApiQuery({ name: 'q', type: String, required: false })
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  list(
    @Query('status') status?: ServiceRequestStatus,
    @Query('category') category?: ServiceRequestCategory,
    @Query('q') q?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.listForAdmin({
      status: status && status in ServiceRequestStatus ? status : undefined,
      category:
        category && category in ServiceRequestCategory ? category : undefined,
      q: q?.slice(0, 100),
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Post(':id/rematch')
  @ApiOperation({ summary: 'Re-run provider matching for a submitted request' })
  rematch(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.adminRematch(id, user.userId);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Offer the request to a specific verified partner' })
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AdminAssignServiceRequestDto,
  ) {
    return this.service.adminAssign(id, user.userId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cancel or complete a request' })
  setStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AdminServiceRequestStatusDto,
  ) {
    return this.service.adminSetStatus(id, user.userId, dto);
  }
}
