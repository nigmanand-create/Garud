import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class AddCartItemDto {
  @ApiProperty()
  @IsString()
  listingId: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class CheckoutAddressDto {
  @ApiProperty()
  @IsString()
  @MaxLength(300)
  companyName: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  contactName: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20)
  contactPhone: string;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  addressLine1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  addressLine2?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  state: string;

  @ApiProperty()
  @IsString()
  @MaxLength(12)
  pincode: string;

  @ApiProperty({ default: 'India' })
  @IsString()
  @MaxLength(100)
  country: string;
}

export class PlaceCheckoutDto {
  @ApiProperty({ type: CheckoutAddressDto })
  @ValidateNested()
  @Type(() => CheckoutAddressDto)
  shipping: CheckoutAddressDto;

  @ApiPropertyOptional({ type: CheckoutAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutAddressDto)
  billing?: CheckoutAddressDto;

  @ApiPropertyOptional({ description: 'Use shipping address for billing' })
  @IsOptional()
  @IsBoolean()
  billingSameAsShipping?: boolean;

  @ApiPropertyOptional({ example: '29ABCDE1234F1Z5' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  gstin?: string;

  @ApiPropertyOptional({ example: 'PO-2026-0042' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  purchaseOrderNumber?: string;
}
