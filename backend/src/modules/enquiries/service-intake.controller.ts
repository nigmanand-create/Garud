import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { throttleFor } from '../../config/throttle.config';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../identity/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { CreateServiceRequestDto } from '../service-requests/dto/service-request.dto';
import { EnquiryService } from './enquiry.service';

@ApiTags('Service requests')
@Controller('service-requests')
export class ServiceIntakeController {
  constructor(private readonly enquiryService: EnquiryService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: throttleFor('enquiry') })
  @ApiOperation({
    summary:
      'Submit a service requirement (repair, compliance, finance, scrap, ...) for provider matching',
  })
  create(
    @Body() dto: CreateServiceRequestDto,
    @CurrentUser() user?: AuthenticatedUser | null,
  ) {
    return this.enquiryService.submitServiceRequest(dto, user?.userId);
  }
}
