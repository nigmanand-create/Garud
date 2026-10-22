import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FulfillmentStatus } from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const FULFILLMENT_STATUSES = Object.values(
  FulfillmentStatus,
) as FulfillmentStatus[];

export class UpdateOrderFulfillmentDto {
  @ApiProperty({ enum: FulfillmentStatus, enumName: 'FulfillmentStatus' })
  @IsIn(FULFILLMENT_STATUSES)
  fulfillmentStatus!: FulfillmentStatus;

  @ApiPropertyOptional({ example: 'BlueDart Aviation' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  carrierName?: string;

  @ApiPropertyOptional({ example: 'BD78923410IN' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNumber?: string;

  @ApiPropertyOptional({
    example: 'https://www.bluedart.com/tracking?track=BD78923410IN',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  trackingUrl?: string;

  @ApiPropertyOptional({ example: '2026-10-30T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  estimatedDeliveryAt?: string;

  @ApiPropertyOptional({ example: ['UA000492819', 'SN-MTR-99214'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hardwareSerialNumbers?: string[];

  @ApiPropertyOptional({ example: 'Fragile avionics payload, handle with care' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  fulfillmentNotes?: string;
}
