import { ConfigService } from '@nestjs/config';
import { InAppNotificationService } from './in-app-notification.service';
import { NotificationService } from './notification.service';
import type { MailProvider } from './notification.types';

describe('InAppNotificationService', () => {
  function build() {
    const prisma = {
      inAppNotification: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([{ id: 'n1' }]),
        count: jest.fn().mockResolvedValue(3),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    return { prisma, svc: new InAppNotificationService(prisma as never) };
  }

  it('lists with unread count and clamps take', async () => {
    const { prisma, svc } = build();
    const res = await svc.list('u1', 999);
    expect(res).toEqual({ items: [{ id: 'n1' }], unreadCount: 3 });
    expect(prisma.inAppNotification.findMany.mock.calls[0][0].take).toBe(50);
  });

  it('scopes mark-read to the owner', async () => {
    const { prisma, svc } = build();
    await svc.markRead('u1', 'n1');
    expect(prisma.inAppNotification.updateMany.mock.calls[0][0].where).toEqual({
      id: 'n1',
      userId: 'u1',
      readAt: null,
    });
    expect(await svc.markAllRead('u1')).toEqual({ updated: 2 });
  });

  it('create never throws', async () => {
    const { prisma, svc } = build();
    prisma.inAppNotification.create.mockRejectedValueOnce(new Error('db'));
    await expect(
      svc.create({ userId: 'u1', type: 'X', title: 'T' }),
    ).resolves.toBe(false);
  });
});

describe('NotificationService in-app channel', () => {
  const send = jest.fn().mockResolvedValue(true);
  const mail: MailProvider = { provider: 'test', send };
  const create = jest.fn().mockResolvedValue(true);
  const inApp = { create } as unknown as InAppNotificationService;
  const config = { get: () => undefined } as unknown as ConfigService;

  beforeEach(() => {
    send.mockClear();
    create.mockClear();
  });

  it('creates a bell notification for the routed partner owner', async () => {
    const svc = new NotificationService(mail, config, inApp);
    await svc.notifyEnquiryCreated({
      id: 'abcdef12',
      name: 'Rahul',
      email: 'r@x.in',
      subject: 'Demo',
      message: 'm',
      intent: 'DEMO',
      partnerEmail: 'p@x.in',
      partnerUserId: 'partner-user',
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'partner-user',
        type: 'LEAD_NEW',
        href: '/partner/enquiries',
      }),
    );
    expect(send).toHaveBeenCalled();
  });

  it('skips bell when no user id and works without the in-app service', async () => {
    const svc = new NotificationService(mail, config, inApp);
    await svc.notifyKycDecision({
      to: 'p@x.in',
      companyName: 'X',
      approved: true,
    });
    expect(create).not.toHaveBeenCalled();

    const bare = new NotificationService(mail, config);
    await expect(
      bare.notifyKycDecision({
        to: 'p@x.in',
        companyName: 'X',
        approved: true,
        userId: 'u1',
      }),
    ).resolves.toBeUndefined();
  });

  it('creates KYC and RFQ bell notifications', async () => {
    const svc = new NotificationService(mail, config, inApp);
    await svc.notifyKycDecision({
      to: 'p@x.in',
      companyName: 'X',
      approved: false,
      reason: 'GST',
      userId: 'u1',
    });
    await svc.notifyRfqInvites({
      rfqId: 'r1',
      title: 'Drones',
      recipients: [{ email: 'a@x.in', companyName: 'A', userId: 'u2' }],
    });
    expect(create.mock.calls.map((c) => c[0].type)).toEqual([
      'KYC_REJECTED',
      'RFQ_INVITE',
    ]);
  });
});
