import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InAppNotificationService } from './in-app-notification.service';
import { MAIL_PROVIDER, type MailProvider } from './notification.types';

export type EnquiryNotificationPayload = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  sourcePage?: string | null;
  intent: string;
  partnerEmail?: string | null;
  partnerCompanyName?: string | null;
  /** Owner user of the routed partner org — receives the in-app (bell) notification. */
  partnerUserId?: string | null;
};

/**
 * Domain-level notifications (enquiry, KYC decision, RFQ invite).
 * Email goes through the `MailProvider` port; in-app (bell) is best-effort and optional.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(MAIL_PROVIDER) private readonly mail: MailProvider,
    private readonly config: ConfigService,
    @Optional() private readonly inApp?: InAppNotificationService,
  ) {}

  private bell(input: {
    userId?: string | null;
    type: string;
    title: string;
    body?: string;
    href: string;
  }): Promise<unknown> {
    if (!this.inApp || !input.userId) return Promise.resolve();
    return this.inApp.create({ ...input, userId: input.userId });
  }

  private get appUrl(): string {
    return (
      this.config.get<string>('PUBLIC_APP_URL') ?? 'http://localhost:3001'
    ).replace(/\/$/, '');
  }

  private get adminRecipients(): string[] {
    return (this.config.get<string>('ADMIN_NOTIFY_EMAIL') ?? '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
  }

  private async safe(label: string, work: () => Promise<unknown>) {
    try {
      await work();
    } catch (error) {
      this.logger.error(
        `${label} notification failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  notifyEnquiryCreated(enquiry: EnquiryNotificationPayload) {
    return this.safe('enquiry', async () => {
      const body = [
        `New ${enquiry.intent.toLowerCase()} enquiry on GarudHub`,
        '',
        `From: ${enquiry.name} <${enquiry.email}>`,
        enquiry.phone ? `Phone: ${enquiry.phone}` : null,
        `Subject: ${enquiry.subject}`,
        enquiry.sourcePage ? `Source: ${enquiry.sourcePage}` : null,
        '',
        enquiry.message,
      ]
        .filter((line): line is string => line !== null)
        .join('\n');

      const jobs: Promise<unknown>[] = [];

      if (this.adminRecipients.length > 0) {
        jobs.push(
          this.mail.send({
            to: this.adminRecipients,
            subject: `[GarudHub] New enquiry: ${enquiry.subject}`,
            text: `${body}\n\nTriage: ${this.appUrl}/admin/enquiries`,
          }),
        );
      }

      if (enquiry.partnerEmail) {
        jobs.push(
          this.mail.send({
            to: enquiry.partnerEmail,
            subject: `[GarudHub] New lead for ${enquiry.partnerCompanyName ?? 'your company'}: ${enquiry.subject}`,
            text: `${body}\n\nView in your partner inbox: ${this.appUrl}/partner/enquiries`,
          }),
        );
      }

      jobs.push(
        this.bell({
          userId: enquiry.partnerUserId,
          type: 'LEAD_NEW',
          title: `New lead: ${enquiry.subject}`,
          body: `${enquiry.name} <${enquiry.email}>`,
          href: '/partner/enquiries',
        }),
      );

      jobs.push(
        this.mail.send({
          to: enquiry.email,
          subject: 'We received your GarudHub enquiry',
          text: `Hi ${enquiry.name},\n\nThanks for reaching out about "${enquiry.subject}". Our team (or the relevant partner) will respond within 1–2 business days.\n\nReference: ${enquiry.id.slice(0, 8)}\n\n— GarudHub`,
        }),
      );

      await Promise.all(jobs);
    });
  }

  notifyEnquiryRouted(args: {
    enquiry: EnquiryNotificationPayload;
    partnerEmail: string;
    partnerCompanyName: string;
    partnerUserId?: string | null;
  }) {
    return this.safe('enquiry-routed', async () => {
      await this.bell({
        userId: args.partnerUserId,
        type: 'LEAD_ASSIGNED',
        title: `Lead assigned: ${args.enquiry.subject}`,
        body: `${args.enquiry.name} <${args.enquiry.email}>`,
        href: '/partner/enquiries',
      });
      await this.mail.send({
        to: args.partnerEmail,
        subject: `[GarudHub] New lead assigned: ${args.enquiry.subject}`,
        text: [
          `Hello ${args.partnerCompanyName},`,
          '',
          'GarudHub routed a buyer enquiry to your organization.',
          '',
          `From: ${args.enquiry.name} <${args.enquiry.email}>`,
          args.enquiry.phone ? `Phone: ${args.enquiry.phone}` : '',
          `Subject: ${args.enquiry.subject}`,
          '',
          args.enquiry.message,
          '',
          `Partner inbox: ${this.appUrl}/partner/enquiries`,
        ]
          .filter((l, i, arr) => l !== '' || arr[i - 1] !== '')
          .join('\n'),
      });
    });
  }

  notifyKycDecision(args: {
    to: string;
    companyName: string;
    approved: boolean;
    reason?: string | null;
    userId?: string | null;
  }) {
    return this.safe('kyc', async () => {
      await this.bell({
        userId: args.userId,
        type: args.approved ? 'KYC_APPROVED' : 'KYC_REJECTED',
        title: args.approved
          ? 'Your partner application is approved'
          : 'Update on your partner application',
        body: args.approved ? undefined : (args.reason ?? undefined),
        href: args.approved ? '/partner' : '/partner/application',
      });
      const subject = args.approved
        ? '[GarudHub] Your partner application is approved'
        : '[GarudHub] Update on your partner application';
      const text = args.approved
        ? `Hello ${args.companyName},\n\nYour GarudHub partner application has been approved. You can now publish listings and receive RFQs and leads.\n\nDashboard: ${this.appUrl}/partner`
        : `Hello ${args.companyName},\n\nYour GarudHub partner application was not approved.${
            args.reason ? `\n\nReason: ${args.reason}` : ''
          }\n\nYou can update your application and resubmit: ${this.appUrl}/partner/application`;
      await this.mail.send({ to: args.to, subject, text });
    });
  }

  notifyRfqInvites(args: {
    rfqId: string;
    title: string;
    recipients: {
      email: string;
      companyName: string;
      userId?: string | null;
    }[];
  }) {
    return this.safe('rfq-invite', async () => {
      await Promise.all(
        args.recipients.map(async (r) => {
          await this.bell({
            userId: r.userId,
            type: 'RFQ_INVITE',
            title: `New RFQ invitation: ${args.title}`,
            href: `/partner/rfqs/${args.rfqId}`,
          });
          return this.mail.send({
            to: r.email,
            subject: `[GarudHub] New RFQ invitation: ${args.title}`,
            text: `Hello ${r.companyName},\n\nA buyer posted a requirement matching your catalog: "${args.title}".\n\nReview and quote: ${this.appUrl}/partner/rfqs/${args.rfqId}`,
          });
        }),
      );
    });
  }
}
