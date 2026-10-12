'use client';

import Link from 'next/link';
import {
  type InputHTMLAttributes,
  type ReactNode,
  useId,
  useState,
} from 'react';

type AuthPageProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthPage({ title, subtitle, children, footer }: AuthPageProps) {
  return (
    <div className="platform-auth-page">
      <Link href="/" className="platform-auth-back">
        ← Back to home
      </Link>
      <header className="platform-auth-header">
        <h1 className="platform-title">{title}</h1>
        <p className="platform-subtitle">{subtitle}</p>
      </header>
      {children}
      {footer ? <footer className="platform-auth-footer">{footer}</footer> : null}
    </div>
  );
}

export function AuthSessionGate({
  busy,
  message,
}: {
  busy: boolean;
  message: string;
}) {
  return (
    <AuthPage title="One moment" subtitle="Please wait while we load your session.">
      <div
        className="platform-card platform-auth-card platform-auth-loading"
        aria-busy={busy}
      >
        <p className="platform-muted">{message}</p>
      </div>
    </AuthPage>
  );
}

export function AuthErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      className="platform-card platform-error platform-auth-alert"
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  );
}

type PasswordInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: InputHTMLAttributes<HTMLInputElement>['autoComplete'];
  minLength?: number;
  required?: boolean;
  describedBy?: string;
  hint?: ReactNode;
};

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete = 'current-password',
  minLength = 8,
  required = true,
  describedBy,
  hint,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const hintId = useId();
  const ariaDescribedBy =
    [describedBy, hint ? hintId : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <div className="platform-field">
      <label htmlFor={id}>{label}</label>
      <div className="platform-password-field">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={ariaDescribedBy}
        />
        <button
          type="button"
          className="platform-password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint ? (
        <div id={hintId} className="platform-field-hint">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function passwordStrengthLabel(password: string): {
  level: 0 | 1 | 2 | 3;
  text: string;
} {
  if (!password) {
    return { level: 0, text: 'Use at least 8 characters with letters and numbers.' };
  }
  if (password.length < 8) {
    return { level: 1, text: 'Too short — minimum 8 characters.' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasMixed =
    /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const score =
    (hasLetter ? 1 : 0) +
    (hasNumber ? 1 : 0) +
    (hasMixed ? 1 : 0) +
    (hasSymbol ? 1 : 0);
  if (score >= 3) {
    return { level: 3, text: 'Strong password.' };
  }
  if (score >= 2) {
    return { level: 2, text: 'Good — add mixed case or a symbol for extra strength.' };
  }
  return { level: 1, text: 'Fair — include letters and numbers.' };
}
