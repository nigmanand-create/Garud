import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { InAppNotificationService } from './in-app-notification.service';

@ApiTags('Notifications')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly inApp: InAppNotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Recent in-app notifications + unread count' })
  @ApiQuery({ name: 'take', type: Number, required: false })
  list(@CurrentUser() user: AuthenticatedUser, @Query('take') take?: string) {
    return this.inApp.list(user.userId, take ? Number(take) : undefined);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread count for the header bell' })
  @ApiOkResponse({ schema: { example: { unreadCount: 3 } } })
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return { unreadCount: await this.inApp.unreadCount(user.userId) };
  }

  @Post('read-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark all notifications read' })
  readAll(@CurrentUser() user: AuthenticatedUser) {
    return this.inApp.markAllRead(user.userId);
  }

  @Post(':id/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark one notification read' })
  read(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.inApp.markRead(user.userId, id);
  }
}
