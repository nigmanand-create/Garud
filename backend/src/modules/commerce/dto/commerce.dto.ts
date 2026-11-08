import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export enum CheckoutPaymentMethod {
  ONLINE = 'ONLINE',
  BANK_TRANSFER = 'BANK_TRANSFER',
  OFFLINE_PO = 'OFFLINE_PO',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
}

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
  @ApiPropertyOptional({
    description:
      'Company or organization on the label (optional for personal delivery)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  companyName?: string;

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
  @ApiPropertyOptional({
    description:
      'Use a saved address from GET /buyer/addresses; omit shipping when set',
  })
  @IsOptional()
  @IsString()
  buyerAddressId?: string;

  @ApiPropertyOptional({
    type: CheckoutAddressDto,
    description: 'Required unless buyerAddressId is sent',
  })
  @ValidateIf((o: PlaceCheckoutDto) => !o.buyerAddressId)
  @ValidateNested()
  @Type(() => CheckoutAddressDto)
  shipping?: CheckoutAddressDto;

  @ApiPropertyOptional({ type: CheckoutAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckoutAddressDto)
  billing?: CheckoutAddressDto;

  @ApiPropertyOptional({ description: 'Use shipping address for billing' })
  @IsOptional()
  @IsBoolean()
  billingSameAsShipping?: boolean;

  @ApiPropertyOptional({ example: 'PO-2026-0042' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  purchaseOrderNumber?: string;

  /** When the buyer has multiple seller carts, identify which seller to check out. */
  @ApiPropertyOptional({
    description: 'Partner organization id (seller) for this checkout',
  })
  @IsOptional()
  @IsString()
  vendorOrganizationId?: string;

  @ApiPropertyOptional({
    enum: CheckoutPaymentMethod,
    description: 'How the buyer intends to pay.',
  })
  @IsOptional()
  @IsEnum(CheckoutPaymentMethod)
  paymentMethod?: CheckoutPaymentMethod;

  @ApiPropertyOptional({
    description:
      'After placing the order, save shipping as a new address (only when shipping body is sent, not buyerAddressId)',
  })
  @IsOptional()
  @IsBoolean()
  saveNewAddressToBook?: boolean;

  @ApiPropertyOptional({ example: 'Warehouse' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  saveAddressLabel?: string;

  @ApiPropertyOptional({
    description: 'When saving a new address, set as default',
  })
  @IsOptional()
  @IsBoolean()
  saveAddressAsDefault?: boolean;
}
