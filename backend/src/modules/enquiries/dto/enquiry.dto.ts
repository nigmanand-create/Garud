import { EnquiryStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
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
}

export class UpdateEnquiryStatusDto {
  @ApiProperty({ enum: EnquiryStatus, enumName: 'EnquiryStatus' })
  @IsEnum(EnquiryStatus)
  status: EnquiryStatus;
}
