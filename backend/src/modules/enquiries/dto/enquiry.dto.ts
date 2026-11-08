import { EnquiryIntent, EnquiryStatus, LeadStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEnquiryDto {
  @ApiProperty({ example: 'Rahul Verma' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'rahul@example.com' })
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiProperty({ example: 'DGCA compliance assistance' })
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  subject: string;

  @ApiProperty({ example: 'We need UIN registration support for our fleet.' })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({ example: '/enquiry?service=compliance' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourcePage?: string;

  @ApiPropertyOptional({
    enum: EnquiryIntent,
    enumName: 'EnquiryIntent',
    description:
      'Lead type; inferred from listing/partner/service context if omitted',
  })
  @IsOptional()
  @IsEnum(EnquiryIntent)
  intent?: EnquiryIntent;

  @ApiPropertyOptional({
    example: 'compliance',
    description:
      'Service vertical key (compliance, repair, finance, recycling, training)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  serviceKey?: string;

  @ApiPropertyOptional({
    description:
      'Marketplace listing the enquiry is about (routes to its vendor)',
  })
  @IsOptional()
  @IsUUID()
  listingId?: string;

  @ApiPropertyOptional({
    description:
      'Verified partner organization to contact (routes to that partner)',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

export class UpdateEnquiryStatusDto {
  @ApiProperty({ enum: EnquiryStatus, enumName: 'EnquiryStatus' })
  @IsEnum(EnquiryStatus)
  status: EnquiryStatus;
}

export class BulkEnquiryStatusDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  @Type(() => String)
  ids: string[];

  @ApiProperty({ enum: EnquiryStatus, enumName: 'EnquiryStatus' })
  @IsEnum(EnquiryStatus)
  status: EnquiryStatus;
}

export class AssignEnquiryDto {
  @ApiPropertyOptional({
    nullable: true,
    description:
      'Partner organization id; null/omitted returns the enquiry to the admin queue',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string | null;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ enum: LeadStatus, enumName: 'LeadStatus' })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({ description: 'Private partner note' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  partnerNote?: string;
}

/** Admin operations: same as partner patch plus optional reroute to another verified partner. */
export class AdminUpdateLeadDto extends UpdateLeadDto {
  @ApiPropertyOptional({
    description:
      'Move this lead to another partner (updates enquiry routing). Omit to leave unchanged.',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
