'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import {
  ACCOUNT_TYPE_LABELS,
  BUYER_ENTERPRISE_ACCOUNT_TYPES,
  GOVERNMENT_ACCOUNT_TYPES,
  PARTNER_ACCOUNT_TYPES,
} from '@/lib/platform/labels';
import type { AccountType } from '@/lib/api/types';
import { ApiError } from '@/lib/api/types';
import { useAuth } from '@/components/platform/AuthProvider';
import {
  AuthErrorBanner,
  AuthPage,
  AuthSessionGate,
  PasswordInput,
  passwordStrengthLabel,
} from '@/components/platform/AuthCard';

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <AuthSessionGate busy message="Loading registration…" />
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const { register, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accountType, setAccountType] = useState<AccountType>('MANUFACTURER');
  const [form, setForm] = useState({
    email: '',
    password: '',
    companyName: '',
    country: 'India',
    state: '',
    city: '',
    website: '',
    contactPersonName: '',
    contactEmail: '',
    contactMobile: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isPartnerType = PARTNER_ACCOUNT_TYPES.includes(accountType);
  const passwordStrength = useMemo(
    () => passwordStrengthLabel(form.password),
    [form.password],
  );

  useEffect(() => {
    if (!loading && user) {
      router.replace('/marketplace');
    }
  }, [loading, user, router]);

  useEffect(() => {
    const type = searchParams.get('type');
    if (!type) return;
    if (type.toLowerCase() === 'partner') {
      setAccountType(PARTNER_ACCOUNT_TYPES[0]);
      return;
    }
    const asAccount = type.toUpperCase() as AccountType;
    if (PARTNER_ACCOUNT_TYPES.includes(asAccount)) {
      setAccountType(asAccount);
    }
  }, [searchParams]);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setTermsError(null);

    if (!acceptedTerms) {
      setTermsError('Please accept the terms to create an account.');
      return;
    }

    setSubmitting(true);
    try {
      const u = await register({
        ...form,
        email: form.email.trim(),
        accountType,
        state: form.state.trim() || undefined,
        city: form.city.trim() || undefined,
        website: form.website.trim() || undefined,
      });
      router.push(
        u.role === 'PARTNER' ? '/partner/application' : '/buyer/rfqs',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || user) {
    return (
      <AuthSessionGate
        busy={loading}
        message={loading ? 'Checking your session…' : 'Redirecting…'}
      />
    );
  }

  return (
    <AuthPage
      title="Create account"
      subtitle="Join as a verified partner or register as a buyer to post RFQs."
      footer={
        <p className="platform-muted">
          Already registered?{' '}
          <Link href="/auth/login" className="platform-auth-link-accent">
            Sign in
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
        <fieldset className="platform-form-section">
          <legend className="platform-form-section-title">Account type</legend>
          <p className="platform-form-section-desc">
            Choose how you will use GarudHub. Partner accounts require verification
            before listing in the marketplace.
          </p>
          <div className="platform-field">
            <label htmlFor="accountType">I am registering as</label>
            <select
              id="accountType"
              name="accountType"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as AccountType)}
            >
              <optgroup label="Partner — verification required">
                {PARTNER_ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Buyer — enterprise">
                {BUYER_ENTERPRISE_ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Government — PSU">
                {GOVERNMENT_ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          {isPartnerType ? (
            <p className="platform-callout platform-callout--partner">
              After signup, complete your partner application and upload documents
              for admin approval.
            </p>
          ) : null}
        </fieldset>

        <fieldset className="platform-form-section">
          <legend className="platform-form-section-title">Sign-in details</legend>
          <div className="platform-field">
            <label htmlFor="email">Login email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>
          <PasswordInput
            id="password"
            label="Password"
            value={form.password}
            onChange={(v) => update('password', v)}
            autoComplete="new-password"
            hint={
              <p
                className={`platform-password-strength--${passwordStrength.level}`}
              >
                {passwordStrength.text}
              </p>
            }
          />
        </fieldset>

        <fieldset className="platform-form-section">
          <legend className="platform-form-section-title">Company</legend>
          <div className="platform-field">
            <label htmlFor="companyName">Company or organization name</label>
            <input
              id="companyName"
              name="organization"
              autoComplete="organization"
              required
              value={form.companyName}
              onChange={(e) => update('companyName', e.target.value)}
            />
          </div>

          <div className="platform-field-row">
            <div className="platform-field">
              <label htmlFor="country">Country</label>
              <input
                id="country"
                name="country"
                autoComplete="country-name"
                required
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
              />
            </div>
            <div className="platform-field">
              <label htmlFor="state">State / province</label>
              <input
                id="state"
                name="state"
                autoComplete="address-level1"
                value={form.state}
                onChange={(e) => update('state', e.target.value)}
              />
            </div>
            <div className="platform-field">
              <label htmlFor="city">City</label>
              <input
                id="city"
                name="city"
                autoComplete="address-level2"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
              />
            </div>
          </div>

          <div className="platform-field">
            <label htmlFor="website">Website (optional)</label>
            <input
              id="website"
              name="website"
              type="url"
              autoComplete="url"
              placeholder="https://"
              value={form.website}
              onChange={(e) => update('website', e.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="platform-form-section">
          <legend className="platform-form-section-title">Primary contact</legend>
          <div className="platform-field-row">
            <div className="platform-field">
              <label htmlFor="contactPersonName">Contact person</label>
              <input
                id="contactPersonName"
                name="contactPersonName"
                autoComplete="name"
                required
                value={form.contactPersonName}
                onChange={(e) => update('contactPersonName', e.target.value)}
              />
            </div>
            <div className="platform-field">
              <label htmlFor="contactEmail">Contact email</label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                autoComplete="email"
                required
                value={form.contactEmail}
                onChange={(e) => update('contactEmail', e.target.value)}
              />
            </div>
            <div className="platform-field">
              <label htmlFor="contactMobile">Mobile</label>
              <input
                id="contactMobile"
                name="contactMobile"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                minLength={8}
                value={form.contactMobile}
                onChange={(e) => update('contactMobile', e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <div className="platform-checkbox-row">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              if (e.target.checked) setTermsError(null);
            }}
            aria-invalid={termsError ? true : undefined}
            aria-describedby={termsError ? 'terms-error' : undefined}
          />
          <label htmlFor="terms">
            I agree to GarudHub&apos;s terms of service and understand that partner
            accounts are subject to verification.
          </label>
        </div>
        {termsError ? (
          <p id="terms-error" className="platform-field-hint platform-password-strength--1">
            {termsError}
          </p>
        ) : null}

        <button
          type="submit"
          className="platform-btn platform-btn-full"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthPage>
  );
}
