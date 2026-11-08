import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  GovOpportunityStatus,
  GovOpportunityType,
  UserRole,
} from '@prisma/client';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import {
  CreateGovOpportunityDto,
  ImportGovOpportunitiesDto,
  UpdateGovOpportunityDto,
} from './dto/gov.dto';
import { GovService } from './gov.service';

@ApiTags('Government')
@Controller('gov/opportunities')
export class PublicGovController {
  constructor(private readonly gov: GovService) {}

  @Get()
  @ApiOperation({ summary: 'Published tenders, schemes and subsidies' })
  list(
    @Query('type') type?: GovOpportunityType,
    @Query('state') state?: string,
    @Query('q') q?: string,
    @Query('includeExpired') includeExpired?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.gov.listPublic({
      type: type && type in GovOpportunityType ? type : undefined,
      state: state?.slice(0, 100),
      q: q?.slice(0, 100),
      includeExpired: includeExpired === 'true',
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Tender / scheme detail' })
  get(@Param('id') id: string) {
    return this.gov.getPublic(id);
  }
}

@ApiTags('Admin')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('admin/gov-opportunities')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class AdminGovController {
  constructor(private readonly gov: GovService) {}

  @Get()
  @ApiOperation({ summary: 'All tenders / schemes (any status)' })
  @ApiQuery({ name: 'status', enum: GovOpportunityStatus, required: false })
  @ApiQuery({ name: 'type', enum: GovOpportunityType, required: false })
  list(
    @Query('status') status?: GovOpportunityStatus,
    @Query('type') type?: GovOpportunityType,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.gov.listForAdmin({
      status: status && status in GovOpportunityStatus ? status : undefined,
      type: type && type in GovOpportunityType ? type : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Post('import')
  @ApiOperation({
    summary:
      'Bulk import tenders/schemes from CSV file, CSV text, or JSON rows',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/ImportGovOpportunitiesDto' },
        {
          type: 'object',
          properties: {
            file: { type: 'string', format: 'binary' },
            csv: { type: 'string' },
          },
        },
      ],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  importBulk(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ImportGovOpportunitiesDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (body?.rows?.length) {
      return this.gov.importJsonRows(user.userId, body.rows);
    }
    const csvText =
      (file?.buffer && file.buffer.toString('utf-8')) || body?.csv?.trim();
    if (!csvText) {
      throw new BadRequestException(
        'Provide a CSV file, csv text field, or rows array',
      );
    }
    return this.gov.importFromCsv(user.userId, csvText);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Tender / scheme detail with bid vault (admin)' })
  get(@Param('id') id: string) {
    return this.gov.getForAdmin(id);
  }

  @Get(':opportunityId/bids/:bidId/document')
  @ApiOperation({
    summary: 'Download sealed bid proposal (after closing date)',
  })
  downloadBidDocument(
    @Param('opportunityId') opportunityId: string,
    @Param('bidId') bidId: string,
  ): Promise<StreamableFile> {
    return this.gov.downloadBidDocumentForAdmin(opportunityId, bidId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a tender / scheme / subsidy' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGovOpportunityDto,
  ) {
    return this.gov.create(user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit, publish or close an opportunity' })
  update(@Param('id') id: string, @Body() dto: UpdateGovOpportunityDto) {
    return this.gov.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an opportunity' })
  remove(@Param('id') id: string) {
    return this.gov.remove(id);
  }
}
