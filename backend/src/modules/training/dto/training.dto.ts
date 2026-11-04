import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  StudentLeadStatus,
  TrainingBatchStatus,
  TrainingCourseType,
  TrainingMode,
} from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class InstituteProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  accreditation?: string;

  @ApiPropertyOptional({ description: 'DGCA RPTO approval number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  rptoApprovalNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  about?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  locations?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  scheduleNotes?: string;
}

export class CreateCourseDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ enum: TrainingCourseType })
  @IsOptional()
  @IsEnum(TrainingCourseType)
  courseType?: TrainingCourseType;

  @ApiPropertyOptional({ enum: TrainingMode })
  @IsOptional()
  @IsEnum(TrainingMode)
  mode?: TrainingMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(730)
  durationDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  feeInr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  eligibility?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateCourseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ enum: TrainingCourseType })
  @IsOptional()
  @IsEnum(TrainingCourseType)
  courseType?: TrainingCourseType;

  @ApiPropertyOptional({ enum: TrainingMode })
  @IsOptional()
  @IsEnum(TrainingMode)
  mode?: TrainingMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(730)
  durationDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  feeInr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  eligibility?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class CreateBatchDto {
  @ApiProperty({ example: '2026-12-01' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(10000)
  seats: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  seatsFilled?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ enum: TrainingBatchStatus })
  @IsOptional()
  @IsEnum(TrainingBatchStatus)
  status?: TrainingBatchStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateBatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  seats?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  seatsFilled?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ enum: TrainingBatchStatus })
  @IsOptional()
  @IsEnum(TrainingBatchStatus)
  status?: TrainingBatchStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CourseInterestDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Preferred batch of this course' })
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

export class UpdateStudentLeadDto {
  @ApiPropertyOptional({ enum: StudentLeadStatus })
  @IsOptional()
  @IsEnum(StudentLeadStatus)
  status?: StudentLeadStatus;

  @ApiPropertyOptional({ description: 'Private institute note' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  partnerNote?: string;
}
