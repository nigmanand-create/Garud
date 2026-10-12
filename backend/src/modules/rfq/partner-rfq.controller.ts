import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
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
import { SubmitQuotationDto } from './dto/rfq.dto';
import { RfqService } from './rfq.service';

@ApiTags('RFQ (Partner)')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('partner/rfqs')
@UseGuards(JwtAuthGuard, RolesGuard, VerifiedPartnerGuard)
@Roles(UserRole.PARTNER)
export class PartnerRfqController {
  constructor(private readonly rfqService: RfqService) {}

  @Get()
  @ApiOperation({ summary: 'RFQs invited to your organization' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.rfqService.listPartnerRfqs(user.userId);
  }

  @Post('quotations/:quotationId/withdraw')
  @ApiOperation({ summary: 'Withdraw a submitted quotation' })
  withdraw(
    @CurrentUser() user: AuthenticatedUser,
    @Param('quotationId') quotationId: string,
  ) {
    return this.rfqService.withdrawQuotation(user.userId, quotationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'RFQ detail (if invited)' })
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rfqService.getPartnerRfq(user.userId, id);
  }

  @Post(':id/quotations')
  @ApiOperation({ summary: 'Submit or replace your quotation' })
  quote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitQuotationDto,
  ) {
    return this.rfqService.submitQuotation(user.userId, id, dto);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline to quote on this RFQ' })
  decline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rfqService.declineRfq(user.userId, id);
  }
}
