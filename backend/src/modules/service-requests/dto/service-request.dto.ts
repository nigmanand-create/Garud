import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceRequestCategory, ServiceRequestStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateServiceRequestDto {
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

  @ApiProperty({ enum: ServiceRequestCategory })
  @IsEnum(ServiceRequestCategory)
  category: ServiceRequestCategory;

  @ApiProperty({ example: 'Crash repair for agri spray drone' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @ApiPropertyOptional({ example: 'Karnataka' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description:
      'Vertical-specific intake fields (flat key/value, e.g. droneModel, loanAmountInr)',
  })
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}

export class ServiceCoverageDto {
  @ApiProperty({ enum: ServiceRequestCategory, isArray: true })
  @IsArray()
  @ArrayMaxSize(10)
  @IsEnum(ServiceRequestCategory, { each: true })
  categories: ServiceRequestCategory[];

  @ApiProperty({
    type: [String],
    description: 'States served; empty array = no restriction (nationwide)',
  })
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  states: string[];
}

export class PartnerServiceRequestUpdateDto {
  @ApiPropertyOptional({
    enum: [ServiceRequestStatus.COMPLETED],
    description: 'Only COMPLETED is allowed for the assigned partner',
  })
  @IsOptional()
  @IsEnum(ServiceRequestStatus)
  status?: ServiceRequestStatus;

  @ApiPropertyOptional({
    description: 'Progress note visible to the requester',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class AdminServiceRequestStatusDto {
  @ApiProperty({ enum: ServiceRequestStatus })
  @IsEnum(ServiceRequestStatus)
  status: ServiceRequestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class AdminAssignServiceRequestDto {
  @ApiProperty()
  @IsUUID()
  organizationId: string;
}
