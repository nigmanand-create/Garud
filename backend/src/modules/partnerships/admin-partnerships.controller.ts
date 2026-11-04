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
import { PartnershipRequestStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { DecidePartnershipRequestDto } from './dto/partnership.dto';
import { PartnershipsService } from './partnerships.service';

@ApiTags('Admin')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('admin/partnerships')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class AdminPartnershipsController {
  constructor(private readonly partnerships: PartnershipsService) {}

  @Get()
  @ApiOperation({ summary: 'List partner partnership requests' })
  @ApiQuery({ name: 'status', enum: PartnershipRequestStatus, required: false })
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  list(
    @Query('status') status?: PartnershipRequestStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.partnerships.listForAdmin({
      status: status && status in PartnershipRequestStatus ? status : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Move a request to under review, approved or declined',
  })
  decide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DecidePartnershipRequestDto,
  ) {
    return this.partnerships.decide(user.userId, id, dto);
  }
}
