import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanBillingPeriod } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CheckoutPlanDto {
  @ApiProperty({ example: 'GROWTH' })
  @IsString()
  @IsNotEmpty()
  planKey: string;
}

export class VerifySubscriptionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razorpaySubscriptionId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razorpaySignature: string;
}

export class CreatePlanDto {
  @ApiPropertyOptional({
    description: 'Unique key, UPPER_SNAKE_CASE (derived from name if omitted)',
  })
  @IsOptional()
  @Matches(/^[A-Z0-9_]{2,40}$/)
  key?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiProperty({ description: 'Price per billing period in INR (0 = free)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000)
  priceInr: number;

  @ApiPropertyOptional({ enum: PlanBillingPeriod })
  @IsOptional()
  @IsEnum(PlanBillingPeriod)
  billingPeriod?: PlanBillingPeriod;

  @ApiPropertyOptional({ nullable: true, description: 'null = unlimited' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  listingLimit?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  featuredPlacement?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  rfqPriority?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  features?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

/** Same fields as create; every field optional, `key` is immutable. */
export class UpdatePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000)
  priceInr?: number;

  @ApiPropertyOptional({ enum: PlanBillingPeriod })
  @IsOptional()
  @IsEnum(PlanBillingPeriod)
  billingPeriod?: PlanBillingPeriod;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  listingLimit?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  featuredPlacement?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  rfqPriority?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  features?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class AssignPlanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ example: 'ENTERPRISE' })
  @IsString()
  @IsNotEmpty()
  planKey: string;
}
