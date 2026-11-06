'use client';

import type { AccountType } from '@/lib/api/types';
import { googleAuthStartUrl } from '@/lib/platform/google-auth';

type GoogleAuthButtonProps = {
  mode: 'login' | 'register';
  intent?: string;
  accountType?: AccountType;
  label?: string;
};

export function GoogleAuthButton({
  mode,
  intent,
  accountType,
  label,
}: GoogleAuthButtonProps) {
  const href = googleAuthStartUrl({ mode, intent, accountType });
  const buttonLabel =
    label ?? (mode === 'login' ? 'Sign in with Google' : 'Sign up with Google');

  return (
    <a
      href={href}
      className="platform-btn-google platform-btn-full"
      aria-label={buttonLabel}
    >
      <span className="platform-btn-google__icon" aria-hidden="true">
        <GoogleIcon />
      </span>
      <span className="platform-btn-google__label">{buttonLabel}</span>
    </a>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.083 36 24 36c-5.522 0-10-4.478-10-10s4.478-10 10-10c2.761 0 5.262 1.125 7.071 2.943l5.657-5.657C34.046 10.053 29.268 8 24 8 14.059 8 6 16.059 6 26s8.059 18 18 18 18-8.059 18-18c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6 26c0-1.657.285-3.247.795-4.735l9.717 7.115C15.909 30.882 19.636 32 24 32c2.761 0 5.262-1.125 7.071-2.943l5.657 5.657C34.046 41.947 29.268 44 24 44 14.059 44 6 35.941 6 26z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-9.722 7.49C6.203 41.443 14.059 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.638 44 26c0-2.015-.403-3.936-1.389-5.917z"
      />
    </svg>
  );
}

export function AuthOrDivider() {
  return (
    <div className="platform-auth-or" role="separator">
      <span>or</span>
    </div>
  );
}
