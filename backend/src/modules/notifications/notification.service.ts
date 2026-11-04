import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

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
};

/** Domain-level transactional emails (enquiry, KYC decision, RFQ invite). */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

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
  }) {
    return this.safe('enquiry-routed', async () => {
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
  }) {
    return this.safe('kyc', async () => {
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
    recipients: { email: string; companyName: string }[];
  }) {
    return this.safe('rfq-invite', async () => {
      await Promise.all(
        args.recipients.map((r) =>
          this.mail.send({
            to: r.email,
            subject: `[GarudHub] New RFQ invitation: ${args.title}`,
            text: `Hello ${r.companyName},\n\nA buyer posted a requirement matching your catalog: "${args.title}".\n\nReview and quote: ${this.appUrl}/partner/rfqs/${args.rfqId}`,
          }),
        ),
      );
    });
  }
}
