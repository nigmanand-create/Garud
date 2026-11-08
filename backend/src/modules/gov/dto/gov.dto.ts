import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GovOpportunityStatus, GovOpportunityType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
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

export class SubmitGovBidDto {
  @ApiProperty({ example: 1250000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amountInr: number;

  @ApiPropertyOptional({
    description:
      'Relative path returned from POST …/bid-document (gov-bids/{userId}/…)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  storedRelativePath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  originalFilename?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;
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

/** One row for JSON bulk import (fields align with CSV columns). */
export class ImportGovOpportunityRowDto {
  @IsOptional()
  @IsEnum(GovOpportunityType)
  type?: GovOpportunityType;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  issuingBody?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  sourceUrl?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedValueInr?: number;

  @IsOptional()
  @IsDateString()
  openDate?: string;

  @IsOptional()
  @IsDateString()
  closingDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  eligibility?: string;

  @IsOptional()
  @IsString()
  publish?: string;

  @IsOptional()
  @IsEnum(GovOpportunityStatus)
  status?: GovOpportunityStatus;
}

export class ImportGovOpportunitiesDto {
  @ApiPropertyOptional({
    description: 'Raw CSV text (headers flexible; see GOV_TENDER_IMPORT.md)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5_000_000)
  csv?: string;

  @ApiPropertyOptional({ type: [ImportGovOpportunityRowDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportGovOpportunityRowDto)
  rows?: ImportGovOpportunityRowDto[];
}
