import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageSenderSide, Prisma, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { SendMessageDto, StartConversationDto } from './dto/message.dto';

const LIST_INCLUDE = {
  partnerOrganization: { select: { id: true, companyName: true } },
  buyerOrganization: { select: { id: true, companyName: true } },
  listing: { select: { id: true, name: true } },
  messages: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { body: true, senderSide: true, createdAt: true },
  },
} satisfies Prisma.ConversationInclude;

type ListRow = Prisma.ConversationGetPayload<{ include: typeof LIST_INCLUDE }>;

export function isUnreadFor(
  side: MessageSenderSide,
  c: {
    lastMessageAt: Date;
    lastMessageSide: MessageSenderSide | null;
    buyerLastReadAt: Date | null;
    partnerLastReadAt: Date | null;
  },
): boolean {
  // Only the counterparty's messages can be unread.
  if (!c.lastMessageSide || c.lastMessageSide === side) return false;
  const readAt =
    side === MessageSenderSide.BUYER ? c.buyerLastReadAt : c.partnerLastReadAt;
  return !readAt || readAt < c.lastMessageAt;
}

/** Threaded buyer <-> partner messaging (MVP, polling-based; no email fan-out yet). */
@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  private async partnerOrgId(userId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!org) {
      throw new NotFoundException('Partner organization not found');
    }
    return org.id;
  }

  private presentRow(side: MessageSenderSide, row: ListRow) {
    const { messages, ...rest } = row;
    return {
      ...rest,
      lastMessage: messages[0] ?? null,
      unread: isUnreadFor(side, row),
    };
  }

  private scopeWhere(
    side: MessageSenderSide,
    scopeId: string,
  ): Prisma.ConversationWhereInput {
    return side === MessageSenderSide.BUYER
      ? { buyerUserId: scopeId }
      : { partnerOrganizationId: scopeId };
  }

  /** scopeId = buyer userId (BUYER) or partner organizationId (PARTNER). */
  async list(side: MessageSenderSide, scopeId: string) {
    const rows = await this.prisma.conversation.findMany({
      where: this.scopeWhere(side, scopeId),
      include: LIST_INCLUDE,
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
    });
    const items = rows.map((r) => this.presentRow(side, r));
    return { items, unreadCount: items.filter((i) => i.unread).length };
  }

  listForBuyer(userId: string) {
    return this.list(MessageSenderSide.BUYER, userId);
  }

  async listForPartner(userId: string) {
    return this.list(
      MessageSenderSide.PARTNER,
      await this.partnerOrgId(userId),
    );
  }

  async unreadCountForBuyer(userId: string) {
    return (await this.listForBuyer(userId)).unreadCount;
  }

  private async getOwned(side: MessageSenderSide, scopeId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, ...this.scopeWhere(side, scopeId) },
      include: {
        partnerOrganization: { select: { id: true, companyName: true } },
        buyerOrganization: { select: { id: true, companyName: true } },
        listing: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 500 },
      },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  async getThread(side: MessageSenderSide, scopeId: string, id: string) {
    const conversation = await this.getOwned(side, scopeId, id);
    return { ...conversation, unread: isUnreadFor(side, conversation) };
  }

  getThreadForBuyer(userId: string, id: string) {
    return this.getThread(MessageSenderSide.BUYER, userId, id);
  }

  async getThreadForPartner(userId: string, id: string) {
    return this.getThread(
      MessageSenderSide.PARTNER,
      await this.partnerOrgId(userId),
      id,
    );
  }

  private async markRead(side: MessageSenderSide, scopeId: string, id: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: { id, ...this.scopeWhere(side, scopeId) },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Conversation not found');
    }
    await this.prisma.conversation.update({
      where: { id },
      data:
        side === MessageSenderSide.BUYER
          ? { buyerLastReadAt: new Date() }
          : { partnerLastReadAt: new Date() },
      select: { id: true },
    });
    return { ok: true };
  }

  markReadForBuyer(userId: string, id: string) {
    return this.markRead(MessageSenderSide.BUYER, userId, id);
  }

  async markReadForPartner(userId: string, id: string) {
    return this.markRead(
      MessageSenderSide.PARTNER,
      await this.partnerOrgId(userId),
      id,
    );
  }

  private async append(
    side: MessageSenderSide,
    scopeId: string,
    senderUserId: string,
    id: string,
    dto: SendMessageDto,
  ) {
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Message cannot be empty');
    }
    await this.getOwned(side, scopeId, id);
    const now = new Date();
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId: id,
          senderUserId,
          senderSide: side,
          body,
          createdAt: now,
        },
      }),
      this.prisma.conversation.update({
        where: { id },
        data: {
          lastMessageAt: now,
          lastMessageSide: side,
          // Sender has implicitly read their own thread.
          ...(side === MessageSenderSide.BUYER
            ? { buyerLastReadAt: now }
            : { partnerLastReadAt: now }),
        },
        select: { id: true },
      }),
    ]);
    return message;
  }

  sendAsBuyer(userId: string, id: string, dto: SendMessageDto) {
    return this.append(MessageSenderSide.BUYER, userId, userId, id, dto);
  }

  async sendAsPartner(userId: string, id: string, dto: SendMessageDto) {
    return this.append(
      MessageSenderSide.PARTNER,
      await this.partnerOrgId(userId),
      userId,
      id,
      dto,
    );
  }

  /** Buyer starts (or continues) a thread with a verified partner. */
  async startAsBuyer(userId: string, dto: StartConversationDto) {
    const [partner, buyerOrg] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
        select: { id: true, ownerId: true, verificationStatus: true },
      }),
      this.prisma.organization.findUnique({
        where: { ownerId: userId },
        select: { id: true },
      }),
    ]);
    if (
      !partner ||
      partner.verificationStatus !== VerificationStatus.APPROVED
    ) {
      throw new NotFoundException('Partner not found');
    }
    if (partner.ownerId === userId) {
      throw new ForbiddenException('You cannot message your own organization');
    }

    let listingId: string | null = null;
    if (dto.listingId) {
      const listing = await this.prisma.partnerListing.findFirst({
        where: {
          id: dto.listingId,
          organizationId: partner.id,
          isPublished: true,
          reviewStatus: 'APPROVED',
        },
        select: { id: true },
      });
      if (!listing) {
        throw new BadRequestException(
          'Listing does not belong to this partner',
        );
      }
      listingId = listing.id;
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        buyerUserId: userId,
        partnerOrganizationId: partner.id,
        listingId,
      },
      select: { id: true },
    });
    if (existing) {
      await this.sendAsBuyer(userId, existing.id, { body: dto.body });
      return { id: existing.id, created: false };
    }

    const now = new Date();
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Message cannot be empty');
    }
    const created = await this.prisma.conversation.create({
      data: {
        buyerUserId: userId,
        buyerOrganizationId: buyerOrg?.id ?? null,
        partnerOrganizationId: partner.id,
        listingId,
        subject: dto.subject.trim(),
        lastMessageAt: now,
        lastMessageSide: MessageSenderSide.BUYER,
        buyerLastReadAt: now,
        messages: {
          create: {
            senderUserId: userId,
            senderSide: MessageSenderSide.BUYER,
            body,
            createdAt: now,
          },
        },
      },
      select: { id: true },
    });
    return { id: created.id, created: true };
  }
}
