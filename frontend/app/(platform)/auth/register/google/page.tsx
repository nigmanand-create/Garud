'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import {
  AuthErrorBanner,
  AuthPage,
  AuthSessionGate,
} from '@/components/platform/AuthCard';
import { ApiError } from '@/lib/api/types';
import type { AccountType } from '@/lib/api/types';
import { authApi, apiRequest } from '@/lib/api/client';
import { useAuth } from '@/components/platform/AuthProvider';
import { redirectPathAfterLogin } from '@/lib/platform/auth-login';
import {
  ACCOUNT_TYPE_LABELS,
  BUYER_ENTERPRISE_ACCOUNT_TYPES,
  GOVERNMENT_ACCOUNT_TYPES,
  PARTNER_ACCOUNT_TYPES,
} from '@/lib/platform/labels';
import { googleAuthStartUrl } from '@/lib/platform/google-auth';

type PendingGoogle = {
  email: string;
  displayName: string;
  accountType?: AccountType;
};

export default function RegisterGooglePage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<PendingGoogle | null>(null);
  const [accountType, setAccountType] = useState<AccountType>('MANUFACTURER');
  const [form, setForm] = useState({
    companyName: '',
    country: 'India',
    state: '',
    city: '',
    website: '',
    contactPersonName: '',
    contactEmail: '',
    contactMobile: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isBuyerEnterprise =
    BUYER_ENTERPRISE_ACCOUNT_TYPES.includes(accountType);

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectPathAfterLogin(user));
    }
  }, [loading, user, router]);

  useEffect(() => {
    void apiRequest<{ pending: PendingGoogle | null }>('/auth/google/pending')
      .then((res) => {
        if (!res.pending) {
          setError('Google signup session expired. Start again from registration.');
          return;
        }
        setPending(res.pending);
        if (res.pending.accountType) {
          setAccountType(res.pending.accountType);
        }
        setForm((f) => ({
          ...f,
          contactPersonName: res.pending!.displayName,
          contactEmail: res.pending!.email,
        }));
      })
      .catch(() => {
        setError('Could not load Google signup session.');
      });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pending) return;
    setError(null);
    setSubmitting(true);
    try {
      const companyTrimmed = form.companyName.trim();
      let companyName = companyTrimmed;
      if (!companyName && isBuyerEnterprise) {
        const name =
          form.contactPersonName.trim() || pending.displayName.trim();
        companyName =
          name.length >= 2
            ? name
            : `Individual buyer — ${pending.email}`;
      }
      await apiRequest('/auth/google/complete', {
        method: 'POST',
        body: {
          email: pending.email,
          accountType,
          ...form,
          companyName,
        },
      });
      await refreshUser();
      const me = await authApi.me();
      router.push(redirectPathAfterLogin(me));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || user) {
    return <AuthSessionGate busy={loading} message="Loading…" />;
  }

  return (
    <AuthPage
      title="Complete your account"
      subtitle="We received your Google profile. Add your organization details to finish."
      footer={
        <p className="platform-muted">
          <Link href="/auth/register" className="platform-auth-link-accent">
            Back to registration
          </Link>
        </p>
      }
    >
      <AuthErrorBanner message={error} />
      {pending ? (
        <form className="platform-card platform-form platform-auth-card" onSubmit={onSubmit}>
          <div className="platform-field">
            <label>Email (Google)</label>
            <input type="email" value={pending.email} readOnly disabled />
          </div>
          <div className="platform-field">
            <label htmlFor="accountType">Account type</label>
            <select
              id="accountType"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as AccountType)}
            >
              {[
                ...PARTNER_ACCOUNT_TYPES,
                ...BUYER_ENTERPRISE_ACCOUNT_TYPES,
                ...GOVERNMENT_ACCOUNT_TYPES,
              ].map((t) => (
                <option key={t} value={t}>
                  {ACCOUNT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="platform-field">
            <label htmlFor="companyName">
              {isBuyerEnterprise
                ? 'Company name (optional)'
                : 'Company name'}
            </label>
            <input
              id="companyName"
              autoComplete="organization"
              required={!isBuyerEnterprise}
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
            {isBuyerEnterprise ? (
              <p className="platform-field-hint">
                Leave blank if you are registering as an individual buyer; we
                will use your name from Google.
              </p>
            ) : null}
          </div>
          <div className="platform-field">
            <label htmlFor="contactMobile">Mobile</label>
            <input
              id="contactMobile"
              required
              value={form.contactMobile}
              onChange={(e) => setForm({ ...form, contactMobile: e.target.value })}
            />
          </div>
          <button type="submit" className="platform-btn platform-btn-full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      ) : (
        <p className="platform-muted">
          <a href={googleAuthStartUrl({ mode: 'register' })}>Continue with Google</a> to start again.
        </p>
      )}
    </AuthPage>
  );
}
