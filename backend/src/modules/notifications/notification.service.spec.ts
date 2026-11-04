import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const send = jest.fn().mockResolvedValue(true);
  const mail = { send } as unknown as MailService;

  function build(env: Record<string, string> = {}) {
    const config = {
      get: (key: string) => env[key],
    } as unknown as ConfigService;
    return new NotificationService(mail, config);
  }

  const enquiry = {
    id: 'abcdef12-0000',
    name: 'Rahul',
    email: 'rahul@example.com',
    subject: 'Demo request',
    message: 'Please schedule a demo.',
    intent: 'DEMO',
  };

  beforeEach(() => send.mockClear());

  it('emails admin, routed partner and the submitter on new enquiry', async () => {
    const svc = build({ ADMIN_NOTIFY_EMAIL: 'ops@garud.in, boss@garud.in' });
    await svc.notifyEnquiryCreated({
      ...enquiry,
      partnerEmail: 'sales@partner.in',
      partnerCompanyName: 'Partner Co',
    });
    const recipients = send.mock.calls.map((c) => c[0].to);
    expect(recipients).toEqual([
      ['ops@garud.in', 'boss@garud.in'],
      'sales@partner.in',
      'rahul@example.com',
    ]);
  });

  it('skips admin mail when ADMIN_NOTIFY_EMAIL is unset', async () => {
    const svc = build();
    await svc.notifyEnquiryCreated(enquiry);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].to).toBe('rahul@example.com');
  });

  it('never throws when the mail provider fails', async () => {
    send.mockRejectedValueOnce(new Error('smtp down'));
    const svc = build({ ADMIN_NOTIFY_EMAIL: 'ops@garud.in' });
    await expect(svc.notifyEnquiryCreated(enquiry)).resolves.toBeUndefined();
  });

  it('sends KYC approve and reject copy', async () => {
    const svc = build();
    await svc.notifyKycDecision({
      to: 'p@x.in',
      companyName: 'X',
      approved: true,
    });
    await svc.notifyKycDecision({
      to: 'p@x.in',
      companyName: 'X',
      approved: false,
      reason: 'GST mismatch',
    });
    expect(send.mock.calls[0][0].subject).toContain('approved');
    expect(send.mock.calls[1][0].text).toContain('GST mismatch');
  });

  it('sends one invite mail per RFQ recipient', async () => {
    const svc = build();
    await svc.notifyRfqInvites({
      rfqId: 'r1',
      title: 'Spray drones',
      recipients: [
        { email: 'a@x.in', companyName: 'A' },
        { email: 'b@x.in', companyName: 'B' },
      ],
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0].text).toContain('/partner/rfqs/r1');
  });
});
