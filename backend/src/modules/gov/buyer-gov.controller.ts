import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { MAX_UPLOAD_BYTES } from '../documents/documents.constants';
import { SubmitGovBidDto } from './dto/gov.dto';
import { GovBidDocumentService } from './gov-bid-document.service';
import { GovService } from './gov.service';

@ApiTags('Government (Buyer)')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('buyer/gov-opportunities')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER, UserRole.GOVERNMENT)
export class BuyerGovController {
  constructor(
    private readonly gov: GovService,
    private readonly bidDocuments: GovBidDocumentService,
  ) {}

  @Post(':id/bid-document')
  @ApiOperation({ summary: 'Upload a sealed bid proposal (PDF / image, max 5 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  uploadBidDocument(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.bidDocuments.storeForBidder(user.userId, file);
  }

  @Post(':id/bids')
  @ApiOperation({ summary: 'Submit or update a sealed tender bid before deadline' })
  submitBid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitGovBidDto,
  ) {
    return this.gov.submitBid(user.userId, user.role, id, dto);
  }

  @Get(':id/bids/mine')
  @ApiOperation({ summary: 'Your bid on this tender (amount visible only to you)' })
  myBid(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.gov.getMyBid(user.userId, user.role, id);
  }
}
