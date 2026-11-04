import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MessageSenderSide, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { isUnreadFor, MessagesService } from './messages.service';

describe('isUnreadFor', () => {
  const t0 = new Date('2026-01-01T10:00:00Z');
  const t1 = new Date('2026-01-01T11:00:00Z');

  it('is unread only for the counterparty of the last message', () => {
    const base = {
      lastMessageAt: t1,
      lastMessageSide: MessageSenderSide.BUYER,
      buyerLastReadAt: null,
      partnerLastReadAt: t0,
    };
    expect(isUnreadFor(MessageSenderSide.PARTNER, base)).toBe(true);
    expect(isUnreadFor(MessageSenderSide.BUYER, base)).toBe(false);
    expect(
      isUnreadFor(MessageSenderSide.PARTNER, {
        ...base,
        partnerLastReadAt: t1,
      }),
    ).toBe(false);
    expect(
      isUnreadFor(MessageSenderSide.PARTNER, {
        ...base,
        lastMessageSide: null,
      }),
    ).toBe(false);
  });
});

describe('MessagesService', () => {
  let service: MessagesService;

  const prismaMock = {
    organization: { findUnique: jest.fn() },
    partnerListing: { findFirst: jest.fn() },
    conversation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    message: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(MessagesService);
    prismaMock.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
  });

  const partnerOrg = {
    id: 'org-p',
    ownerId: 'partner-user',
    verificationStatus: VerificationStatus.APPROVED,
  };

  function orgLookup(partner: unknown) {
    prismaMock.organization.findUnique.mockImplementation(
      ({ where }: { where: { id?: string; ownerId?: string } }) =>
        Promise.resolve(where.id ? partner : { id: 'org-b' }),
    );
  }

  it('creates a new conversation with the first buyer message', async () => {
    orgLookup(partnerOrg);
    prismaMock.conversation.findFirst.mockResolvedValue(null);
    prismaMock.conversation.create.mockResolvedValue({ id: 'c-1' });

    const res = await service.startAsBuyer('buyer-1', {
      organizationId: 'org-p',
      subject: 'Hello',
      body: '  Need a quote ',
    });

    expect(res).toEqual({ id: 'c-1', created: true });
    const arg = prismaMock.conversation.create.mock.calls[0][0];
    expect(arg.data.buyerUserId).toBe('buyer-1');
    expect(arg.data.lastMessageSide).toBe(MessageSenderSide.BUYER);
    expect(arg.data.messages.create.body).toBe('Need a quote');
  });

  it('appends to an existing thread instead of creating a duplicate', async () => {
    orgLookup(partnerOrg);
    prismaMock.conversation.findFirst
      .mockResolvedValueOnce({ id: 'c-9' }) // existing lookup
      .mockResolvedValueOnce({ id: 'c-9', messages: [] }); // getOwned
    prismaMock.message.create.mockResolvedValue({ id: 'm-1' });
    prismaMock.conversation.update.mockResolvedValue({ id: 'c-9' });

    const res = await service.startAsBuyer('buyer-1', {
      organizationId: 'org-p',
      subject: 'Hello again',
      body: 'Follow up',
    });

    expect(res).toEqual({ id: 'c-9', created: false });
    expect(prismaMock.conversation.create).not.toHaveBeenCalled();
  });

  it('blocks unverified partners and self-messaging', async () => {
    orgLookup({ ...partnerOrg, verificationStatus: VerificationStatus.DRAFT });
    await expect(
      service.startAsBuyer('buyer-1', {
        organizationId: 'org-p',
        subject: 'Hi',
        body: 'x',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    orgLookup(partnerOrg);
    await expect(
      service.startAsBuyer('partner-user', {
        organizationId: 'org-p',
        subject: 'Hi',
        body: 'x',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects listings that do not belong to the partner', async () => {
    orgLookup(partnerOrg);
    prismaMock.partnerListing.findFirst.mockResolvedValue(null);
    await expect(
      service.startAsBuyer('buyer-1', {
        organizationId: 'org-p',
        listingId: 'l-1',
        subject: 'Hi',
        body: 'x',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('scopes partner replies to their org and updates read markers', async () => {
    prismaMock.organization.findUnique.mockResolvedValue({ id: 'org-p' });
    prismaMock.conversation.findFirst.mockResolvedValue({ id: 'c-1' });
    prismaMock.message.create.mockResolvedValue({ id: 'm-1' });
    prismaMock.conversation.update.mockResolvedValue({ id: 'c-1' });

    await service.sendAsPartner('partner-user', 'c-1', {
      body: 'Quote attached',
    });

    expect(prismaMock.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c-1', partnerOrganizationId: 'org-p' },
      }),
    );
    const upd = prismaMock.conversation.update.mock.calls[0][0];
    expect(upd.data.lastMessageSide).toBe(MessageSenderSide.PARTNER);
    expect(upd.data.partnerLastReadAt).toBeInstanceOf(Date);
  });

  it('refuses to send into someone else’s thread', async () => {
    prismaMock.conversation.findFirst.mockResolvedValue(null);
    await expect(
      service.sendAsBuyer('buyer-2', 'c-1', { body: 'hi' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.message.create).not.toHaveBeenCalled();
  });

  it('computes unread count for list', async () => {
    const t0 = new Date('2026-01-01T10:00:00Z');
    const t1 = new Date('2026-01-01T11:00:00Z');
    prismaMock.conversation.findMany.mockResolvedValue([
      {
        id: 'a',
        lastMessageAt: t1,
        lastMessageSide: MessageSenderSide.PARTNER,
        buyerLastReadAt: t0,
        partnerLastReadAt: t1,
        messages: [],
      },
      {
        id: 'b',
        lastMessageAt: t1,
        lastMessageSide: MessageSenderSide.BUYER,
        buyerLastReadAt: t1,
        partnerLastReadAt: null,
        messages: [],
      },
    ]);
    const res = await service.list(MessageSenderSide.BUYER, 'buyer-1');
    expect(res.unreadCount).toBe(1);
    expect(res.items.find((i) => i.id === 'a')?.unread).toBe(true);
  });
});
