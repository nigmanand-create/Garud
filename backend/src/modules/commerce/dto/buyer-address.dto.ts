import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBuyerAddressDto {
  @ApiProperty({ example: 'Office' })
  @IsString()
  @MaxLength(80)
  label: string;

  @ApiPropertyOptional({
    description:
      'Company or organization (optional). Leave blank for personal delivery.',
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
  line1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  line2?: string;

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

  @ApiPropertyOptional({
    description: 'Make this the default shipping address',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateBuyerAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

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
  line1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  line2?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
