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
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { EnquiryStatus, UserRole } from '@prisma/client';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { UpdateEnquiryStatusDto } from './dto/enquiry.dto';
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
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  @ApiOkResponse({ description: 'Paginated enquiry list with status counts' })
  list(
    @Query('status') status?: EnquiryStatus,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.enquiryService.listForAdmin({
      status,
      skip: skip != null ? Number(skip) : undefined,
      take: take != null ? Number(take) : undefined,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update enquiry status (e.g. mark as read)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateEnquiryStatusDto) {
    return this.enquiryService.updateStatus(id, dto);
  }
}
