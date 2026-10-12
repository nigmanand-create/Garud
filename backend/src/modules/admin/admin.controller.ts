import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole, VerificationStatus } from '@prisma/client';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { AdminService } from './admin.service';
import { RejectApplicationDto } from './dto/admin.dto';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { DocumentsService } from '../documents/documents.service';

@ApiTags('Admin')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Get('applications')
  @ApiOperation({ summary: 'List partner verification applications' })
  @ApiQuery({ name: 'status', enum: VerificationStatus, required: false })
  @ApiOkResponse({ description: 'Organizations with owner user summary' })
  listApplications(@Query('status') status?: VerificationStatus) {
    return this.adminService.listApplications(status);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Application detail including uploaded documents' })
  getApplication(@Param('id') id: string) {
    return this.adminService.getApplication(id);
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Download an application document' })
  @Header('Content-Type', 'application/octet-stream')
  downloadDocument(@Param('id') id: string): Promise<StreamableFile> {
    return this.documentsService.downloadForAdmin(id);
  }

  @Post('applications/:id/approve')
  @ApiOperation({ summary: 'Approve a submitted application' })
  approve(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.adminService.approveApplication(id, admin.userId);
  }

  @Post('applications/:id/reject')
  @ApiOperation({ summary: 'Reject a submitted application' })
  reject(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.adminService.rejectApplication(id, admin.userId, dto);
  }
}
