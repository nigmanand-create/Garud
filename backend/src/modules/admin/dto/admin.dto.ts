import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectApplicationDto {
  @ApiProperty({ example: 'Incomplete GST documentation' })
  @IsString()
  @MaxLength(2000)
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ApproveListingDto {
  @ApiPropertyOptional({ example: 'Verified technical specs and compliance' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RejectListingDto {
  @ApiProperty({ example: 'Incomplete technical specs or invalid pricing' })
  @IsString()
  @MaxLength(2000)
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UnpublishListingDto {
  @ApiProperty({ example: 'Discontinued product or partner request' })
  @IsString()
  @MaxLength(2000)
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CancelOrderDto {
  @ApiProperty({ example: 'Buyer dispute or partner default' })
  @IsString()
  @MaxLength(1000)
  reason: string;
}

export class UpdateOrderPaymentDto {
  @ApiProperty({ enum: PaymentStatus, enumName: 'PaymentStatus' })
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional({ example: 'RTGS / NEFT payment reference verified' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
