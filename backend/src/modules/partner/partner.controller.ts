import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccountType, UserRole } from '@prisma/client';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { Roles } from '../identity/decorators/roles.decorator';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { UpdatePartnerApplicationDto } from './dto/partner-application.dto';
import { PartnerService } from './partner.service';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';

@ApiTags('Partner')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('partner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARTNER)
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Partner profile, verification status, capability flags',
  })
  @ApiOkResponse({
    description: 'Organization application + canEdit / canListProducts',
  })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.partnerService.getMyApplication(user.userId, user.role);
  }

  @Patch('application')
  @ApiOperation({ summary: 'Update draft or rejected partner application' })
  updateApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePartnerApplicationDto,
  ) {
    return this.partnerService.updateApplication(
      user.userId,
      user.accountType as AccountType,
      dto,
    );
  }

  @Post('application/submit')
  @ApiOperation({ summary: 'Submit application for admin verification' })
  submitApplication(@CurrentUser() user: AuthenticatedUser) {
    return this.partnerService.submitApplication(
      user.userId,
      user.accountType as AccountType,
    );
  }
}
