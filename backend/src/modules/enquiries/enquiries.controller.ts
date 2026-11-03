import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateEnquiryDto } from './dto/enquiry.dto';
import { EnquiryService } from './enquiry.service';

@ApiTags('Enquiries')
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiryService: EnquiryService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Submit a public platform enquiry (lead capture)' })
  @ApiCreatedResponse({ description: 'Enquiry stored for admin review' })
  create(@Body() dto: CreateEnquiryDto) {
    return this.enquiryService.create(dto);
  }
}
