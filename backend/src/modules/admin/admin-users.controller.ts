import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { AdminUsersService } from './admin-users.service';
import {
  CreateAdminUserDto,
  SetUserDisabledDto,
  UpdateUserRoleDto,
} from './dto/admin-users.dto';

@ApiTags('Admin')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List platform users with role counts' })
  @ApiQuery({ name: 'role', enum: UserRole, required: false })
  @ApiQuery({ name: 'status', enum: ['active', 'disabled'], required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  list(
    @Query('role') role?: UserRole,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.users.list({
      role: role && role in UserRole ? role : undefined,
      status: status === 'active' || status === 'disabled' ? status : undefined,
      search,
      skip: skip ? parseInt(skip, 10) || undefined : undefined,
      take: take ? parseInt(take, 10) || undefined : undefined,
    });
  }

  @Post()
  @ApiOperation({
    summary:
      'Create a platform admin with a one-time temporary password (must change on first login)',
  })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateAdminUserDto,
  ) {
    return this.users.createAdmin(actor.userId, dto);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Promote to admin or demote an admin (guarded)' })
  updateRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.users.updateRole(actor.userId, id, dto);
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Issue a one-time temporary password, revoke sessions, force password change',
  })
  resetPassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.users.resetPassword(actor.userId, id);
  }

  @Patch(':id/disabled')
  @ApiOperation({ summary: 'Disable or re-enable a user (soft delete)' })
  setDisabled(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetUserDisabledDto,
  ) {
    return this.users.setDisabled(actor.userId, id, dto.disabled);
  }
}
