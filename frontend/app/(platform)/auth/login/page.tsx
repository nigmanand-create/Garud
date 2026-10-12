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

function redirectPathForRole(role: string) {
  if (role === 'PLATFORM_ADMIN') return '/admin';
  if (role === 'PARTNER') return '/partner';
  return '/buyer/rfqs';
}

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectPathForRole(user.role));
    }
  }, [loading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const u = await login(email.trim(), password);
      router.push(redirectPathForRole(u.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || user) {
    return (
      <AuthSessionGate
        busy={loading}
        message={loading ? 'Checking your session…' : 'Redirecting to your dashboard…'}
      />
    );
  }

  return (
    <AuthPage
      title="Sign in"
      subtitle="Access your GarudHub partner, buyer, or admin dashboard."
      footer={
        <p className="platform-muted">
          No account?{' '}
          <Link href="/auth/register" className="platform-auth-link-accent">
            Create one
          </Link>
        </p>
      }
    >
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
