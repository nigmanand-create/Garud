import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CatalogCategory, ListingType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRfqDto {
  @ApiProperty({ example: '20 agriculture drones for spraying' })
  @IsString()
  @MaxLength(300)
  title: string;

  @ApiProperty()
  @IsString()
  @MaxLength(10000)
  description: string;

  @ApiProperty({ enum: CatalogCategory, enumName: 'CatalogCategory' })
  @IsEnum(CatalogCategory)
  category: CatalogCategory;

  @ApiPropertyOptional({ enum: ListingType, enumName: 'ListingType' })
  @IsOptional()
  @IsEnum(ListingType)
  listingType?: ListingType;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  deadlineAt?: string;
}

export class SubmitQuotationDto {
  @ApiPropertyOptional({ example: 450000 })
  @IsOptional()
  @Type(() => Number)
  priceInr?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  priceOnRequest?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  minOrderQuantity?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  leadTimeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
