import {
  AccountType,
  UserRole,
  VerificationStatus,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'partner@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({ enum: AccountType, enumName: 'AccountType' })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiProperty({ example: 'Example Drone Pvt Ltd' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  companyName: string;

  @ApiProperty({ example: 'India' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  country: string;

  @ApiPropertyOptional({ example: 'Uttar Pradesh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'Prayagraj' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  contactPersonName: string;

  @ApiProperty({ example: 'contact@company.com' })
  @IsEmail()
  contactEmail: string;

  @ApiProperty({ example: '9935760540' })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  contactMobile: string;
}

export class LoginDto {
  @ApiProperty({ example: 'partner@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token from login/register/refresh' })
  @IsString()
  refreshToken: string;
}

export class AuthUserResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role: UserRole;

  @ApiProperty({ enum: AccountType, enumName: 'AccountType' })
  accountType: AccountType;

  @ApiPropertyOptional({ enum: VerificationStatus, enumName: 'VerificationStatus' })
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional()
  orgId?: string;
}

export class AuthTokensResponse {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: AuthUserResponse })
  user: AuthUserResponse;
}
