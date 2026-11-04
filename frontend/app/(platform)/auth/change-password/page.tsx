'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import {
  AuthErrorBanner,
  AuthPage,
  AuthSessionGate,
  PasswordInput,
} from '@/components/platform/AuthCard';
import { useAuth } from '@/components/platform/AuthProvider';
import { authApi } from '@/lib/api/client';
import { ApiError } from '@/lib/api/types';

export default function ChangePasswordPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.changePassword(current, next);
      // Other sessions are revoked server-side; this session's access token stays valid.
      await refreshUser();
      setDone(true);
      setTimeout(() => router.push('/'), 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change password');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <AuthSessionGate busy message="Checking your session…" />;
  }
  if (!user) {
    return (
      <AuthPage title="Change password" subtitle="Sign in first to change your password.">
        <Link href="/auth/login" className="platform-btn">
          Sign in
        </Link>
      </AuthPage>
    );
  }

  return (
    <AuthPage
      title="Change password"
      subtitle={
        user.mustChangePassword
          ? 'Your account uses a temporary password issued by an administrator. Choose a new password to continue.'
          : 'Choose a new password. Your other sessions will be signed out.'
      }
    >
      <AuthErrorBanner message={error} />
      {done ? (
        <div className="platform-card platform-auth-card" role="status">
          Password updated. Redirecting…
        </div>
      ) : (
        <form
          className="platform-card platform-form platform-auth-card"
          onSubmit={onSubmit}
          noValidate
        >
          <PasswordInput
            id="current-password"
            label="Current (or temporary) password"
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
          />
          <PasswordInput
            id="new-password"
            label="New password"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
            minLength={8}
          />
          <PasswordInput
            id="confirm-password"
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
          <button
            type="submit"
            className="platform-btn platform-btn-full"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}
    </AuthPage>
  );
}
