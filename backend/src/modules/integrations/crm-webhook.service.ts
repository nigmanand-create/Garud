import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';
import { getRequestId } from '../../shared/logging/request-context';

export type CrmEventName = 'enquiry.created' | 'enquiry.routed';

/** `sha256=<hex>` HMAC over `${timestamp}.${rawBody}` — receivers verify with the shared secret. */
export function signCrmPayload(
  secret: string,
  timestamp: string,
  body: string,
): string {
  return `sha256=${createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex')}`;
}

/**
 * Outbound CRM webhook. Enabled only when BOTH `CRM_WEBHOOK_URL` and
 * `CRM_WEBHOOK_SECRET` are set (never sends unsigned). Fire-and-forget with
 * bounded retries; failures are logged and never thrown into business flows.
 */
@Injectable()
export class CrmWebhookService {
  private readonly logger = new Logger(CrmWebhookService.name);

  constructor(private readonly config: ConfigService) {}

  private get url(): string | undefined {
    return this.config.get<string>('CRM_WEBHOOK_URL')?.trim() || undefined;
  }

  private get secret(): string | undefined {
    return this.config.get<string>('CRM_WEBHOOK_SECRET')?.trim() || undefined;
  }

  get enabled(): boolean {
    return Boolean(this.url && this.secret);
  }

  /** Non-blocking: schedules delivery and returns immediately. */
  emit(event: CrmEventName, data: Record<string, unknown>): void {
    if (!this.enabled) return;
    void this.deliver(event, data).catch((error: unknown) => {
      this.logger.error(
        `CRM webhook ${event} crashed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  /** Exposed for tests / manual replay. Resolves true when a 2xx was received. */
  async deliver(
    event: CrmEventName,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    const url = this.url;
    const secret = this.secret;
    if (!url || !secret) return false;

    const deliveryId = randomUUID();
    const body = JSON.stringify({
      id: deliveryId,
      event,
      createdAt: new Date().toISOString(),
      data,
    });
    const timeoutMs = this.num('CRM_WEBHOOK_TIMEOUT_MS', 5000);
    const maxAttempts = Math.max(1, this.num('CRM_WEBHOOK_MAX_ATTEMPTS', 3));
    const baseDelay = this.num('CRM_WEBHOOK_RETRY_DELAY_MS', 500);
    const requestId = getRequestId();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Fresh timestamp per attempt so receivers can enforce a replay window.
      const timestamp = String(Math.floor(Date.now() / 1000));
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'GarudHub-Webhook/1',
            'X-Garud-Event': event,
            'X-Garud-Delivery': deliveryId,
            'X-Garud-Timestamp': timestamp,
            'X-Garud-Signature': signCrmPayload(secret, timestamp, body),
            ...(requestId ? { 'X-Request-Id': requestId } : {}),
          },
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (res.ok) return true;
        this.logger.warn(
          `CRM webhook ${event} attempt ${attempt}/${maxAttempts} → HTTP ${res.status}`,
        );
        // 4xx (except 408/429) will not succeed on retry.
        if (
          res.status >= 400 &&
          res.status < 500 &&
          res.status !== 408 &&
          res.status !== 429
        ) {
          return false;
        }
      } catch (error) {
        this.logger.warn(
          `CRM webhook ${event} attempt ${attempt}/${maxAttempts} failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, baseDelay * 2 ** (attempt - 1)));
      }
    }
    this.logger.error(
      `CRM webhook ${event} (${deliveryId}) gave up after ${maxAttempts} attempts`,
    );
    return false;
  }

  private num(key: string, fallback: number): number {
    const n = Number(this.config.get<string>(key));
    return Number.isFinite(n) &&
      n >= 0 &&
      this.config.get<string>(key) !== undefined
      ? n
      : fallback;
  }
}
