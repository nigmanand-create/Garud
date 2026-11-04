import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  StudentLeadStatus,
  TrainingCourseType,
  TrainingMode,
  UserRole,
} from '@prisma/client';
import { throttleFor } from '../../config/throttle.config';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { OptionalJwtAuthGuard } from '../identity/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import {
  CourseInterestDto,
  CreateBatchDto,
  CreateCourseDto,
  InstituteProfileDto,
  UpdateBatchDto,
  UpdateCourseDto,
  UpdateStudentLeadDto,
} from './dto/training.dto';
import { TrainingService } from './training.service';

@ApiTags('Training')
@Controller('training/courses')
export class PublicTrainingController {
  constructor(private readonly training: TrainingService) {}

  @Get()
  @ApiOperation({ summary: 'Published courses from verified institutes' })
  list(
    @Query('type') type?: TrainingCourseType,
    @Query('mode') mode?: TrainingMode,
    @Query('state') state?: string,
    @Query('q') q?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.training.listPublic({
      type: type && type in TrainingCourseType ? type : undefined,
      mode: mode && mode in TrainingMode ? mode : undefined,
      state: state?.slice(0, 100),
      q: q?.slice(0, 100),
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Course detail with upcoming batches' })
  get(@Param('id') id: string) {
    return this.training.getPublic(id);
  }

  @Post(':id/interest')
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: throttleFor('enquiry') })
  @ApiOperation({
    summary: 'Student course interest → TRAINING lead in the institute inbox',
  })
  interest(
    @Param('id') id: string,
    @Body() dto: CourseInterestDto,
    @CurrentUser() user?: AuthenticatedUser | null,
  ) {
    return this.training.expressInterest(id, dto, user?.userId);
  }
}

@ApiTags('Training (Partner)')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('partner/training')
@UseGuards(JwtAuthGuard, RolesGuard, VerifiedPartnerGuard)
@Roles(UserRole.PARTNER)
export class PartnerTrainingController {
  constructor(private readonly training: TrainingService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Institute profile (accreditation, locations)' })
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.training.getProfile(user);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update institute profile' })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InstituteProfileDto,
  ) {
    return this.training.updateProfile(user, dto);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Your courses with batches' })
  courses(@CurrentUser() user: AuthenticatedUser) {
    return this.training.listOwnCourses(user);
  }

  @Post('courses')
  @ApiOperation({ summary: 'Create a course' })
  createCourse(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCourseDto,
  ) {
    return this.training.createCourse(user, dto);
  }

  @Patch('courses/:id')
  @ApiOperation({ summary: 'Update / publish a course' })
  updateCourse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.training.updateCourse(user, id, dto);
  }

  @Delete('courses/:id')
  @ApiOperation({ summary: 'Delete a course and its batches' })
  deleteCourse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.training.deleteCourse(user, id);
  }

  @Post('courses/:id/batches')
  @ApiOperation({ summary: 'Add a batch to a course' })
  createBatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateBatchDto,
  ) {
    return this.training.createBatch(user, id, dto);
  }

  @Patch('batches/:id')
  @ApiOperation({ summary: 'Update a batch (dates, seats, status)' })
  updateBatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.training.updateBatch(user, id, dto);
  }

  @Delete('batches/:id')
  @ApiOperation({ summary: 'Delete a batch' })
  deleteBatch(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.training.deleteBatch(user, id);
  }

  @Get('leads')
  @ApiOperation({ summary: 'Student course-interest inbox' })
  leads(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: StudentLeadStatus,
    @Query('courseId') courseId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.training.listStudentLeads(user, {
      status: status && status in StudentLeadStatus ? status : undefined,
      courseId: courseId || undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Patch('leads/:id')
  @ApiOperation({ summary: 'Update a student lead status / private note' })
  updateLead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentLeadDto,
  ) {
    return this.training.updateStudentLead(user, id, dto);
  }
}
