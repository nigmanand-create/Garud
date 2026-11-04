export type MailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

/**
 * Email transport port. `NotificationService` depends on this interface (via the
 * `MAIL_PROVIDER` token), so SES / SendGrid / Postmark adapters can replace the
 * default SMTP/log provider without touching domain code.
 */
export interface MailProvider {
  readonly provider: string;
  /** Resolves true when accepted by the provider (or logged). Must not throw. */
  send(message: MailMessage): Promise<boolean>;
}

export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');

/** Payload for a single in-app (bell) notification. */
export type InAppNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
};
