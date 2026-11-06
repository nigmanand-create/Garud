import type { AccountType } from '@/lib/api/types';

const API_PREFIX = '/platform-api/v1';

export function googleAuthStartUrl(params: {
  mode: 'login' | 'register';
  intent?: string;
  accountType?: AccountType;
}): string {
  const q = new URLSearchParams({ mode: params.mode });
  if (params.intent) q.set('intent', params.intent);
  if (params.accountType) q.set('accountType', params.accountType);
  return `${API_PREFIX}/auth/google?${q.toString()}`;
}

export const GOOGLE_OAUTH_ERRORS: Record<string, string> = {
  oauth_not_configured: 'Google sign-in is not configured on this server yet.',
  oauth_denied: 'Google sign-in was cancelled.',
  oauth_state_invalid: 'Sign-in session expired. Please try again.',
  oauth_failed: 'Google sign-in failed. Try again or use email.',
  email_not_verified: 'Your Google email is not verified.',
  no_account: 'No account for this Google email. Create an account first.',
  google_account_conflict: 'This Google account cannot be linked. Contact support.',
  account_disabled: 'This account is disabled.',
};
