import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PartnershipRequestStatus,
  PartnershipRequestType,
} from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePartnershipRequestDto {
  @ApiProperty({
    enum: PartnershipRequestType,
    enumName: 'PartnershipRequestType',
  })
  @IsEnum(PartnershipRequestType)
  type: PartnershipRequestType;

  @ApiProperty({ example: 'Authorized distributor for South India' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'We operate 4 service centres and want to distribute...',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message: string;

  @ApiPropertyOptional({ example: 'Karnataka, Tamil Nadu' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  regions?: string;

  @ApiPropertyOptional({
    description:
      'Verified partner organization you want to partner with (optional)',
  })
  @IsOptional()
  @IsUUID()
  targetOrganizationId?: string;
}

export class DecidePartnershipRequestDto {
  @ApiProperty({
    enum: [
      PartnershipRequestStatus.UNDER_REVIEW,
      PartnershipRequestStatus.APPROVED,
      PartnershipRequestStatus.DECLINED,
    ],
  })
  @IsEnum(PartnershipRequestStatus)
  status: PartnershipRequestStatus;

  @ApiPropertyOptional({ description: 'Shown to the requesting partner' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
