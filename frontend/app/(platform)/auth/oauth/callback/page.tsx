'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { AuthSessionGate } from '@/components/platform/AuthCard';
import { authApi } from '@/lib/api/client';
import { redirectPathAfterLogin } from '@/lib/platform/auth-login';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      router.replace(`/auth/login?error=${encodeURIComponent(error)}`);
      return;
    }
    if (searchParams.get('success') !== '1') {
      router.replace('/auth/login');
      return;
    }
    void (async () => {
      try {
        const me = await authApi.me();
        router.replace(redirectPathAfterLogin(me));
      } catch {
        router.replace('/auth/login?error=oauth_failed');
      }
    })();
  }, [router, searchParams]);

  return <AuthSessionGate busy message="Signing you in…" />;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<AuthSessionGate busy message="Signing you in…" />}>
      <OAuthCallbackContent />
    </Suspense>
  );
}
