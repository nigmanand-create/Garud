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
  ValidateNested,
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

  @ApiPropertyOptional({ example: 10.5, description: 'Minimum payload capacity in kg' })
  @IsOptional()
  @Type(() => Number)
  payloadCapacityKg?: number;

  @ApiPropertyOptional({ example: 45, description: 'Minimum flight endurance in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  enduranceMinutes?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether DGCA Type Certification is mandatory' })
  @IsOptional()
  @IsBoolean()
  isDgcaRequired?: boolean;

  @ApiPropertyOptional({ example: 500000, description: 'Target budget in INR' })
  @IsOptional()
  @Type(() => Number)
  targetBudgetInr?: number;

  @ApiPropertyOptional({ example: 'https://specs.garudhub.com/tender-doc.pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  specsDocumentUrl?: string;
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

  @ApiPropertyOptional({ example: 12.0, description: 'Quoted drone payload capacity in kg' })
  @IsOptional()
  @Type(() => Number)
  quotedPayloadKg?: number;

  @ApiPropertyOptional({ example: 50, description: 'Quoted flight time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quotedEnduranceMin?: number;

  @ApiPropertyOptional({ example: 'DGCA-TC-2024-UAV-092' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dgcaModelNumber?: string;

  @ApiPropertyOptional({ example: 24, description: 'Warranty period in months' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  warrantyMonths?: number;
}

export class RfqOrderAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  addressLine2?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(12)
  pincode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

export class AcceptQuotationDto {
  @ApiPropertyOptional({ type: () => RfqOrderAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RfqOrderAddressDto)
  shipping?: RfqOrderAddressDto;

  @ApiPropertyOptional({ type: () => RfqOrderAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RfqOrderAddressDto)
  billing?: RfqOrderAddressDto;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  billingSameAsShipping?: boolean;

  @ApiPropertyOptional({ example: '29ABCDE1234F1Z5' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  gstin?: string;

  @ApiPropertyOptional({ example: 'PO-RFQ-2026-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  purchaseOrderNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class RejectQuotationDto {
  @ApiPropertyOptional({ example: 'Price exceeds project budget' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
