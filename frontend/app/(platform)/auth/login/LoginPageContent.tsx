'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import {
  AuthErrorBanner,
  AuthPage,
  AuthSessionGate,
  PasswordInput,
} from '@/components/platform/AuthCard';
import { ApiError } from '@/lib/api/types';
import { useAuth } from '@/components/platform/AuthProvider';
import {
  getLoginPageCopy,
  LOGIN_INTENTS,
  loginPathForIntent,
  redirectPathAfterLogin,
  type LoginIntent,
} from '@/lib/platform/auth-login';
import { hasClientAuthSessionHint } from '@/lib/api/auth-storage';
import { ROLE_LOGIN_LINKS } from '@/lib/platform/header-nav';

export function LoginPageContent({ intent }: { intent?: LoginIntent }) {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { title, subtitle } = getLoginPageCopy(intent);

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectPathAfterLogin(user));
    }
  }, [loading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const u = await login(email.trim(), password);
      router.push(redirectPathAfterLogin(u));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  const sessionHint = hasClientAuthSessionHint();

  if (user) {
    return (
      <AuthSessionGate busy={false} message="Redirecting to your dashboard…" />
    );
  }

  if (loading && sessionHint) {
    return <AuthSessionGate busy message="Checking your session…" />;
  }

  return (
    <AuthPage
      title={title}
      subtitle={subtitle}
      footer={
        <>
          {!intent && (
            <p className="platform-muted platform-auth-role-picker">
              Sign in for a specific role:{' '}
              {LOGIN_INTENTS.map((key, i) => (
                <span key={key}>
                  {i > 0 && ' · '}
                  <Link href={loginPathForIntent(key)} className="platform-auth-link-accent">
                    {ROLE_LOGIN_LINKS[key].label}
                  </Link>
                </span>
              ))}
            </p>
          )}
          {intent && (
            <p className="platform-muted platform-auth-intent-switch">
              Wrong portal?{' '}
              {LOGIN_INTENTS.filter((key) => key !== intent).map((key, i) => (
                <span key={key}>
                  {i > 0 && ' · '}
                  <Link href={loginPathForIntent(key)} className="platform-auth-link-accent">
                    {ROLE_LOGIN_LINKS[key].label}
                  </Link>
                </span>
              ))}
              {' · '}
              <Link href="/auth/login" className="platform-auth-link-accent">
                All sign-in options
              </Link>
            </p>
          )}
          <p className="platform-muted">
            No account?{' '}
            <Link href="/auth/register" className="platform-auth-link-accent">
              Create one
            </Link>
          </p>
        </>
      }
    >
      {intent ? (
        <p className="platform-auth-role-hint" role="status">
          Signing in for a <strong>{ROLE_LOGIN_LINKS[intent].label.replace(/ sign in$/i, '')}</strong>{' '}
          account — use the email registered for that role.
        </p>
      ) : null}
      <AuthErrorBanner message={error} />
      <form
        className="platform-card platform-form platform-auth-card"
        onSubmit={onSubmit}
        noValidate
      >
        <div className="platform-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
          />
        </div>

        <PasswordInput
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        <button
          type="submit"
          className="platform-btn platform-btn-full"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthPage>
  );
}
