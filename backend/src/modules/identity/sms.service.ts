import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SmsSendResult = { ok: true } | { ok: false; error: string };

/**
 * Pluggable SMS sender (Twilio, MSG91, or disabled). Used for phone OTP.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const provider = this.provider();
    if (provider === 'twilio') {
      return !!(
        this.config.get<string>('SMS_TWILIO_ACCOUNT_SID')?.trim() &&
        this.config.get<string>('SMS_TWILIO_AUTH_TOKEN')?.trim() &&
        this.config.get<string>('SMS_TWILIO_FROM')?.trim()
      );
    }
    if (provider === 'msg91') {
      return !!this.config.get<string>('SMS_MSG91_AUTHKEY')?.trim();
    }
    return false;
  }

  async sendOtp(phoneE164: string, code: string): Promise<SmsSendResult> {
    const body = this.messageBody(code);
    const provider = this.provider();
    if (provider === 'twilio') {
      return this.sendTwilio(phoneE164, body);
    }
    if (provider === 'msg91') {
      return this.sendMsg91(phoneE164, body);
    }
    return { ok: false, error: 'no_sms_provider' };
  }

  private provider(): 'twilio' | 'msg91' | 'none' {
    const raw = this.config.get<string>('SMS_PROVIDER', 'none')?.trim().toLowerCase();
    if (raw === 'twilio' || raw === 'msg91') {
      return raw;
    }
    return 'none';
  }

  private messageBody(code: string): string {
    const template =
      this.config.get<string>('SMS_OTP_MESSAGE_TEMPLATE')?.trim() ||
      'Your GarudHub verification code is {{code}}. Do not share it.';
    return template.replace(/\{\{\s*code\s*\}\}/gi, code);
  }

  private async sendTwilio(to: string, body: string): Promise<SmsSendResult> {
    const sid = this.config.get<string>('SMS_TWILIO_ACCOUNT_SID')?.trim();
    const token = this.config.get<string>('SMS_TWILIO_AUTH_TOKEN')?.trim();
    const from = this.config.get<string>('SMS_TWILIO_FROM')?.trim();
    if (!sid || !token || !from) {
      return { ok: false, error: 'twilio_not_configured' };
    }
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const form = new URLSearchParams();
    form.set('To', to);
    form.set('From', from);
    form.set('Body', body);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(`Twilio SMS failed: ${res.status} ${text.slice(0, 200)}`);
        return { ok: false, error: 'twilio_http_error' };
      }
      return { ok: true };
    } catch (e) {
      this.logger.warn(`Twilio SMS error: ${e}`);
      return { ok: false, error: 'twilio_network_error' };
    }
  }

  /**
   * MSG91 transactional HTTP API (sendhttp). Route 4 = transactional India.
   */
  private async sendMsg91(mobileE164: string, message: string): Promise<SmsSendResult> {
    const authkey = this.config.get<string>('SMS_MSG91_AUTHKEY')?.trim();
    const sender = this.config.get<string>('SMS_MSG91_SENDER_ID')?.trim() || 'GARUDH';
    const route = this.config.get<string>('SMS_MSG91_ROUTE')?.trim() || '4';
    if (!authkey) {
      return { ok: false, error: 'msg91_not_configured' };
    }
    const mobile = mobileE164.replace(/^\+91/, '');
    const url = new URL('https://api.msg91.com/api/sendhttp.php');
    url.searchParams.set('authkey', authkey);
    url.searchParams.set('mobiles', mobile);
    url.searchParams.set('message', message);
    url.searchParams.set('sender', sender);
    url.searchParams.set('route', route);
    url.searchParams.set('country', '91');
    try {
      const res = await fetch(url.toString(), { method: 'GET' });
      const text = await res.text();
      if (!res.ok) {
        this.logger.warn(`MSG91 SMS failed: ${res.status} ${text.slice(0, 200)}`);
        return { ok: false, error: 'msg91_http_error' };
      }
      if (text.toLowerCase().includes('error')) {
        this.logger.warn(`MSG91 SMS error body: ${text.slice(0, 200)}`);
        return { ok: false, error: 'msg91_api_error' };
      }
      return { ok: true };
    } catch (e) {
      this.logger.warn(`MSG91 SMS network error: ${e}`);
      return { ok: false, error: 'msg91_network_error' };
    }
  }
}
