import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType, UserRole } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional } from 'class-validator';

export class CreateAdminUserDto {
  @ApiProperty({ example: 'ops@garudhub.in' })
  @IsEmail()
  email: string;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({
    enum: AccountType,
    enumName: 'AccountType',
    description:
      'Required when demoting an admin to a role that does not match the current account type',
  })
  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;
}

export class SetUserDisabledDto {
  @ApiProperty()
  @IsBoolean()
  disabled: boolean;
}
