import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CatalogCategory, ListingType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateListingDto {
  @ApiProperty({ enum: ListingType, enumName: 'ListingType' })
  @IsEnum(ListingType)
  listingType: ListingType;

  @ApiProperty({ example: 'Agriculture spraying drone X1' })
  @IsString()
  @MaxLength(300)
  name: string;

  @ApiPropertyOptional({ example: 'Garud Aero' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  brand?: string;

  @ApiPropertyOptional({ example: 'GD-AGRI-X1' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @ApiPropertyOptional({ example: 'https://example.com/images/drone-hero.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  primaryImageUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  galleryImageUrls?: string[];

  @ApiProperty({ enum: CatalogCategory, enumName: 'CatalogCategory' })
  @IsEnum(CatalogCategory)
  category: CatalogCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  technicalSpecs?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applications?: string[];

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

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minOrderQuantity?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  priceOnRequest?: boolean;

  @ApiPropertyOptional({ example: 250000 })
  @ValidateIf((o: CreateListingDto) => o.priceOnRequest === false)
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  priceInr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  warranty?: string;
}

export class UpdateListingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  primaryImageUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  galleryImageUrls?: string[];

  @ApiPropertyOptional({ enum: CatalogCategory })
  @IsOptional()
  @IsEnum(CatalogCategory)
  category?: CatalogCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  technicalSpecs?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applications?: string[];

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  minOrderQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  priceOnRequest?: boolean;

  @ApiPropertyOptional()
  @ValidateIf((o: UpdateListingDto) => o.priceOnRequest === false)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  priceInr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  warranty?: string;
}
