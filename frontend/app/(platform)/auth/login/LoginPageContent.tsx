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
import { authApi } from '@/lib/api/client';
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
import {
  AuthOrDivider,
  GoogleAuthButton,
} from '@/components/platform/GoogleAuthButton';
import { GOOGLE_OAUTH_ERRORS } from '@/lib/platform/google-auth';
import {
  clearPostLoginNext,
  consumePostLoginNext,
  rememberPostLoginNext,
} from '@/lib/platform/post-login-next';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

export function LoginPageContent({ intent }: { intent?: LoginIntent }) {
  return (
    <Suspense fallback={<AuthSessionGate busy message="Loading…" />}>
      <LoginPageContentInner intent={intent} />
    </Suspense>
  );
}

type SignInTab = 'password' | 'phone';

function LoginPageContentInner({ intent }: { intent?: LoginIntent }) {
  const searchParams = useSearchParams();
  const oauthErrorCode = searchParams.get('error');
  const oauthError =
    oauthErrorCode && GOOGLE_OAUTH_ERRORS[oauthErrorCode]
      ? GOOGLE_OAUTH_ERRORS[oauthErrorCode]
      : oauthErrorCode
        ? 'Sign-in failed. Try again.'
        : null;

  const { login, loginWithPhoneOtp, user, loading } = useAuth();
  const router = useRouter();
  /** Default to phone OTP so it is not buried below Google / email on first paint. */
  const [signInTab, setSignInTab] = useState<SignInTab>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  /** Ten-digit India mobile (no country code); displayed with +91 prefix in the field. */
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'code'>('phone');
  const [otpDevHint, setOtpDevHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const { title, subtitle } = getLoginPageCopy(intent);

  const rawNext = searchParams.get('next');
  useEffect(() => {
    if (rawNext) rememberPostLoginNext(rawNext);
    else clearPostLoginNext();
  }, [rawNext]);

  function destinationAfterAuth(u: Parameters<typeof redirectPathAfterLogin>[0]): string {
    return consumePostLoginNext() ?? redirectPathAfterLogin(u);
  }

  useEffect(() => {
    if (!loading && user) {
      router.replace(destinationAfterAuth(user));
    }
  }, [loading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function onRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOtpDevHint(false);
    setOtpSubmitting(true);
    try {
      const res = await authApi.otpRequest(phone.trim().replace(/\D/g, '').slice(-10));
      setOtpStep('code');
      setOtpDevHint(!!res.devOtpLogged);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send code');
    } finally {
      setOtpSubmitting(false);
    }
  }

  async function onVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOtpSubmitting(true);
    try {
      await loginWithPhoneOtp(
        phone.trim().replace(/\D/g, '').slice(-10),
        otpCode.trim(),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed');
    } finally {
      setOtpSubmitting(false);
    }
  }

  function switchTab(tab: SignInTab) {
    setSignInTab(tab);
    setError(null);
    if (tab === 'phone') {
      setOtpStep('phone');
      setOtpCode('');
      setOtpDevHint(false);
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
          account — use the email registered for that role, or the mobile linked to it for OTP.
        </p>
      ) : null}
      <AuthErrorBanner message={oauthError ?? error} />
      <p className="platform-auth-method-intro">
        Choose how to sign in. <strong>SMS OTP (+91)</strong> works if your number is on your GarudHub profile.
      </p>
      <div className="platform-auth-method-tabs" role="tablist" aria-label="Sign-in method">
        <button
          type="button"
          role="tab"
          aria-selected={signInTab === 'phone'}
          className={
            signInTab === 'phone'
              ? 'platform-btn platform-btn-cta'
              : 'platform-btn platform-btn-secondary'
          }
          onClick={() => switchTab('phone')}
        >
          Phone OTP (+91)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={signInTab === 'password'}
          className={
            signInTab === 'password'
              ? 'platform-btn platform-btn-cta'
              : 'platform-btn platform-btn-secondary'
          }
          onClick={() => switchTab('password')}
        >
          Email &amp; password
        </button>
      </div>
      {signInTab === 'phone' ? (
        <>
          <p className="platform-auth-method-hint">
            India mobile only (10 digits after +91). Must match the number on your GarudHub user or
            organization contact.
          </p>
          {otpStep === 'phone' ? (
            <form
              className="platform-card platform-form platform-auth-card"
              onSubmit={onRequestOtp}
              noValidate
            >
              <div className="platform-field">
                <label htmlFor="phone-otp">Mobile number</label>
                <div className="platform-auth-phone-row">
                  <span className="platform-auth-phone-prefix" aria-hidden="true">
                    +91
                  </span>
                  <input
                    id="phone-otp"
                    name="phone"
                    type="tel"
                    autoComplete="tel-national"
                    inputMode="numeric"
                    placeholder="98765 43210"
                    required
                    minLength={10}
                    maxLength={10}
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                    }
                    aria-invalid={error ? true : undefined}
                    aria-describedby="phone-otp-hint"
                  />
                </div>
                <p id="phone-otp-hint" className="platform-field-hint">
                  Enter 10 digits; we will text a one-time code.
                </p>
              </div>
              <button
                type="submit"
                className="platform-btn platform-btn-full"
                disabled={otpSubmitting || phone.replace(/\D/g, '').length !== 10}
                aria-busy={otpSubmitting}
              >
                {otpSubmitting ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form
              className="platform-card platform-form platform-auth-card"
              onSubmit={onVerifyOtp}
              noValidate
            >
              {otpDevHint ? (
                <p className="platform-auth-role-hint" role="status">
                  Dev mode: SMS is not configured or failed — check the <strong>backend log</strong> for the
                  6-digit code.
                </p>
              ) : null}
              <p className="platform-auth-method-hint">
                Code sent to <strong>+91 {phone}</strong>
              </p>
              <div className="platform-field">
                <label htmlFor="otp-code">6-digit code</label>
                <input
                  id="otp-code"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="\d{6}"
                  required
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  aria-invalid={error ? true : undefined}
                />
              </div>
              <button
                type="submit"
                className="platform-btn platform-btn-full"
                disabled={otpSubmitting}
                aria-busy={otpSubmitting}
              >
                {otpSubmitting ? 'Verifying…' : 'Verify and sign in'}
              </button>
              <button
                type="button"
                className="platform-btn platform-btn-secondary platform-btn-full"
                style={{ marginTop: '0.65rem' }}
                disabled={otpSubmitting}
                onClick={() => {
                  setOtpStep('phone');
                  setOtpCode('');
                  setOtpDevHint(false);
                  setError(null);
                }}
              >
                Use a different number
              </button>
            </form>
          )}
        </>
      ) : (
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
      )}
      <AuthOrDivider />
      <GoogleAuthButton mode="login" intent={intent} />
    </AuthPage>
  );
}
