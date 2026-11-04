import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/auth.types';
import { VerifiedPartnerGuard } from '../partner/guards/verified-partner.guard';
import { BEARER_AUTH_NAME } from '../../shared/swagger/swagger.setup';
import { SendMessageDto, StartConversationDto } from './dto/message.dto';
import { MessagesService } from './messages.service';

@ApiTags('Messages (Buyer)')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('buyer/conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER, UserRole.GOVERNMENT)
export class BuyerMessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Your conversations with partners' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.messages.listForBuyer(user.userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Start (or continue) a conversation with a verified partner',
  })
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartConversationDto,
  ) {
    return this.messages.startAsBuyer(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Conversation thread' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messages.getThreadForBuyer(user.userId, id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Reply in a conversation' })
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messages.sendAsBuyer(user.userId, id, dto);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  read(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messages.markReadForBuyer(user.userId, id);
  }
}

@ApiTags('Messages (Partner)')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('partner/conversations')
@UseGuards(JwtAuthGuard, RolesGuard, VerifiedPartnerGuard)
@Roles(UserRole.PARTNER)
export class PartnerMessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Buyer conversations for your organization' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.messages.listForPartner(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Conversation thread' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messages.getThreadForPartner(user.userId, id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Reply to a buyer' })
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messages.sendAsPartner(user.userId, id, dto);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  read(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.messages.markReadForPartner(user.userId, id);
  }
}
