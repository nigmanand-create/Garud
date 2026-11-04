import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GovOpportunityStatus, GovOpportunityType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGovOpportunityDto {
  @ApiProperty({ enum: GovOpportunityType })
  @IsEnum(GovOpportunityType)
  type: GovOpportunityType;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  summary: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiProperty({ example: 'Ministry of Agriculture & Farmers Welfare' })
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  issuingBody: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(1000)
  sourceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedValueInr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  openDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  closingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  eligibility?: string;

  @ApiPropertyOptional({ enum: GovOpportunityStatus })
  @IsOptional()
  @IsEnum(GovOpportunityStatus)
  status?: GovOpportunityStatus;
}

export class UpdateGovOpportunityDto {
  @ApiPropertyOptional({ enum: GovOpportunityType })
  @IsOptional()
  @IsEnum(GovOpportunityType)
  type?: GovOpportunityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  issuingBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(1000)
  sourceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedValueInr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  openDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  closingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  eligibility?: string;

  @ApiPropertyOptional({ enum: GovOpportunityStatus })
  @IsOptional()
  @IsEnum(GovOpportunityStatus)
  status?: GovOpportunityStatus;
}
