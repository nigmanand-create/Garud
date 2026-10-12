import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { CatalogService } from './catalog.service';
import { CreateListingDto, UpdateListingDto } from './dto/listing.dto';
import { ListingMediaService } from './listing-media.service';
import { MAX_LISTING_IMAGE_BYTES } from './listing-media.constants';

@ApiTags('Partner Catalog')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('partner/catalog/listings')
@UseGuards(JwtAuthGuard, RolesGuard, VerifiedPartnerGuard)
@Roles(UserRole.PARTNER)
export class PartnerCatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly listingMediaService: ListingMediaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List your product/service listings' })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.listMine(user.userId);
  }

  @Post('images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_LISTING_IMAGE_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload listing image (JPEG/PNG, max 5MB)' })
  uploadImage(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.listingMediaService.uploadForPartner(user.userId, file);
  }

  @Post()
  @ApiOperation({ summary: 'Create listing (verified partner only)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateListingDto,
  ) {
    return this.catalogService.createForPartner(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get your listing by id' })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.catalogService.getMine(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update your listing' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.catalogService.updateMine(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete your listing' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.catalogService.deleteMine(user.userId, id);
  }
}
