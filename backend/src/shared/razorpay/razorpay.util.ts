import * as crypto from 'crypto';

/** True only on the live production host (`GARUD_DEPLOY_ENV=production`). Staging (`dev`) is not production. */
export function isProductionDeploy(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.GARUD_DEPLOY_ENV === 'production';
}

export function hmacSha256Hex(
  payload: string | Buffer,
  secret: string,
): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/** Constant-time comparison of two hex digests (false on length mismatch / empty input). */
export function safeEqualHex(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature) return false;
  return safeEqualHex(hmacSha256Hex(rawBody, secret), signature);
}

/** Checkout signature for Razorpay Orders: HMAC(order_id|payment_id). */
export function verifyOrderPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  return safeEqualHex(
    hmacSha256Hex(`${orderId}|${paymentId}`, secret),
    signature,
  );
}

/** Checkout signature for Razorpay Subscriptions: HMAC(payment_id|subscription_id). */
export function verifySubscriptionPaymentSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string,
  secret: string,
): boolean {
  return safeEqualHex(
    hmacSha256Hex(`${paymentId}|${subscriptionId}`, secret),
    signature,
  );
}

export type RazorpayCredentials = { keyId: string; keySecret: string };

/** Credentials if fully configured (placeholders ignored), else null → sandbox simulation. */
export function readRazorpayCredentials(
  get: (key: string) => string | undefined,
): RazorpayCredentials | null {
  const keyId = get('RAZORPAY_KEY_ID') || '';
  const keySecret = get('RAZORPAY_KEY_SECRET') || '';
  if (!keyId || !keySecret || keyId.includes('placeholder')) return null;
  return { keyId, keySecret };
}

/** Minimal Razorpay REST call (Basic auth). Throws with the gateway error body on non-2xx. */
export async function razorpayRequest<T>(
  creds: RazorpayCredentials,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<T> {
  const auth = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString(
    'base64',
  );
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Razorpay ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}
