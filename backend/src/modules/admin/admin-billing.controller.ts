import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PartnerSubscriptionStatus, UserRole } from '@prisma/client';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import {
  AssignPlanDto,
  CreatePlanDto,
  UpdatePlanDto,
} from '../partner-billing/dto/billing.dto';
import { PartnerBillingService } from '../partner-billing/partner-billing.service';

/** Admin: configure partner plans / entitlements and oversee subscriptions. */
@ApiTags('Admin')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('admin/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class AdminBillingController {
  constructor(private readonly billing: PartnerBillingService) {}

  @Get('plans')
  @ApiOperation({
    summary: 'All plans with subscriber counts and estimated MRR',
  })
  plans() {
    return this.billing.adminListPlans();
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a plan' })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.billing.adminCreatePlan(dto);
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Update plan price / entitlements / visibility' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.billing.adminUpdatePlan(id, dto);
  }

  @Post('plans/:id/sync-razorpay')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Create the Razorpay plan so partners can check out',
  })
  sync(@Param('id') id: string) {
    return this.billing.adminSyncRazorpayPlan(id);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Recent partner subscriptions' })
  @ApiQuery({
    name: 'status',
    enum: PartnerSubscriptionStatus,
    required: false,
  })
  subscriptions(@Query('status') status?: PartnerSubscriptionStatus) {
    const valid = Object.values(PartnerSubscriptionStatus).includes(
      status as PartnerSubscriptionStatus,
    );
    return this.billing.adminListSubscriptions(valid ? status : undefined);
  }

  @Post('assign')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Assign a plan to a partner without the gateway (comp / offline invoice)',
  })
  assign(@CurrentUser() admin: AuthenticatedUser, @Body() dto: AssignPlanDto) {
    return this.billing.adminAssignPlan(admin.userId, dto);
  }
}
