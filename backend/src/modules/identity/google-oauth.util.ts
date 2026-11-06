import { createHmac, timingSafeEqual } from 'crypto';
import type { AccountType } from '@prisma/client';

export type GoogleOAuthState = {
  mode: 'login' | 'register';
  accountType?: AccountType;
  intent?: string;
  nonce: string;
};

const STATE_TTL_MS = 10 * 60 * 1000;

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Signed OAuth state returned by Google (CSRF + flow metadata). */
export function encodeGoogleOAuthState(
  state: GoogleOAuthState,
  secret: string,
): string {
  const body = JSON.stringify({
    ...state,
    exp: Date.now() + STATE_TTL_MS,
  });
  const sig = signPayload(body, secret);
  return Buffer.from(`${body}.${sig}`).toString('base64url');
}

export function decodeGoogleOAuthState(
  token: string,
  secret: string,
): GoogleOAuthState | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const dot = raw.lastIndexOf('.');
    if (dot < 0) return null;
    const body = raw.slice(0, dot);
    const sig = raw.slice(dot + 1);
    const expected = signPayload(body, secret);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(body) as GoogleOAuthState & { exp: number };
    if (parsed.exp < Date.now()) return null;
    return {
      mode: parsed.mode === 'register' ? 'register' : 'login',
      accountType: parsed.accountType,
      intent: parsed.intent,
      nonce: parsed.nonce,
    };
  } catch {
    return null;
  }
}

export function googleCallbackUrl(publicAppUrl: string): string {
  const base = publicAppUrl.replace(/\/+$/, '');
  return `${base}/platform-api/v1/auth/google/callback`;
}

export const GOOGLE_PENDING_COOKIE = 'garud_google_pending';

export type GooglePendingPayload = {
  sub: string;
  email: string;
  displayName: string;
  accountType?: AccountType;
};

export function encodeGooglePending(
  payload: GooglePendingPayload,
  secret: string,
): string {
  const body = JSON.stringify({
    kind: 'google_pending',
    ...payload,
    exp: Date.now() + STATE_TTL_MS,
  });
  const sig = signPayload(body, secret);
  return Buffer.from(`${body}.${sig}`).toString('base64url');
}

export function decodeGooglePending(
  token: string,
  secret: string,
): GooglePendingPayload | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const dot = raw.lastIndexOf('.');
    if (dot < 0) return null;
    const body = raw.slice(0, dot);
    const sig = raw.slice(dot + 1);
    const expected = signPayload(body, secret);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(body) as GooglePendingPayload & {
      kind: string;
      exp: number;
    };
    if (parsed.kind !== 'google_pending' || parsed.exp < Date.now()) return null;
    return {
      sub: parsed.sub,
      email: parsed.email,
      displayName: parsed.displayName,
      accountType: parsed.accountType,
    };
  } catch {
    return null;
  }
}
