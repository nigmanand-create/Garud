import { AccountType, UserRole, VerificationStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
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

export class RegisterGoogleDto extends RegisterDto {
  @ApiPropertyOptional({
    minLength: 8,
    description: 'Optional if you only use Google sign-in',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  declare password: string;
}

export class OtpRequestDto {
  @ApiProperty({
    example: '9876543210',
    description: 'Indian mobile (10 digits) or +91…',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone: string;
}

export class OtpVerifyDto extends OtpRequestDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/)
  code: string;
}

export class OtpRequestResponse {
  @ApiProperty({
    description: 'True when SMS gateway accepted the send',
  })
  sent: boolean;

  @ApiPropertyOptional({
    description: 'Dev-only: OTP was logged server-side (SMS missing or failed in non-production)',
  })
  devOtpLogged?: boolean;
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
  @ApiPropertyOptional({
    description:
      'Refresh token (optional when sent via httpOnly cookie garud_refresh)',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  currentPassword: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
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

  @ApiPropertyOptional({
    enum: VerificationStatus,
    enumName: 'VerificationStatus',
  })
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional()
  orgId?: string;

  @ApiPropertyOptional({
    description: 'Primary contact person on the organization profile',
  })
  contactPersonName?: string;

  @ApiPropertyOptional({
    description: 'True when an admin issued a temporary password',
  })
  mustChangePassword?: boolean;
}

export class AuthTokensResponse {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: AuthUserResponse })
  user: AuthUserResponse;
}
