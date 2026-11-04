import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

import type { MailMessage, MailProvider } from './notification.types';

export type { MailMessage };

/**
 * Transactional mail provider.
 * - SMTP configured (`SMTP_HOST`) → delivers via nodemailer.
 * - Otherwise → logs the message (dev / staging stub; no external dependency).
 * Failures are logged and never thrown — notifications must not break business flows.
 */
@Injectable()
export class MailService implements MailProvider {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;
  private readonly smtpEnabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.from =
      this.config.get<string>('MAIL_FROM') ??
      'GarudHub <no-reply@garudhub.local>';
    const host = this.config.get<string>('SMTP_HOST');
    this.smtpEnabled = Boolean(host);
    if (host) {
      const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
      const user = this.config.get<string>('SMTP_USER');
      const pass = this.config.get<string>('SMTP_PASS');
      this.transporter = createTransport({
        host,
        port,
        secure:
          this.config.get<string>('SMTP_SECURE') === 'true' || port === 465,
        auth: user ? { user, pass } : undefined,
      });
    }
  }

  get provider(): 'smtp' | 'log' {
    return this.smtpEnabled ? 'smtp' : 'log';
  }

  /** Returns true when the message was accepted by the provider (or logged). */
  async send(message: MailMessage): Promise<boolean> {
    const recipients = (Array.isArray(message.to) ? message.to : [message.to])
      .map((r) => r?.trim())
      .filter((r): r is string => Boolean(r));
    if (recipients.length === 0) {
      return false;
    }

    if (!this.transporter) {
      this.logger.log(
        `[mail:log] to=${recipients.join(',')} subject="${message.subject}"\n${message.text}`,
      );
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: recipients.join(','),
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send mail to ${recipients.join(',')}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }
}
