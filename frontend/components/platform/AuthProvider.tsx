'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authApi } from '@/lib/api/client';
import {
  clearTokens,
  getAccessToken,
  setTokens,
  usesCookieSession,
} from '@/lib/api/auth-storage';
import type { AuthTokensResponse, AuthUser } from '@/lib/api/types';
import {
  loginIntentForRoles,
  loginPathForIntent,
  redirectPathAfterLogin,
  type LoginIntent,
} from '@/lib/platform/auth-login';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginWithPhoneOtp: (phone: string, code: string) => Promise<AuthUser>;
  register: (body: Record<string, unknown>) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const AUTH_ME_TIMEOUT_MS = 10_000;

function homeForUser(user: AuthUser): string {
  return redirectPathAfterLogin(user);
}

async function fetchCurrentUser(): Promise<AuthUser> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('auth_me_timeout')), AUTH_ME_TIMEOUT_MS);
  });
  return Promise.race([authApi.me(), timeout]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applyTokens = useCallback((data: AuthTokensResponse) => {
    if (data.accessToken && data.refreshToken) {
      setTokens(data.accessToken, data.refreshToken);
    }
    setUser(data.user);
    return data.user;
  }, []);

  const refreshUser = useCallback(async () => {
    if (!usesCookieSession() && !getAccessToken()) {
      setUser(null);
      return;
    }
    try {
      const me = await fetchCurrentUser();
      setUser(me);
    } catch {
      clearTokens();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === 'garud_access_token' ||
        event.key === 'garud_refresh_token'
      ) {
        refreshUser();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await authApi.login(email, password);
      return applyTokens(data);
    },
    [applyTokens],
  );

  const loginWithPhoneOtp = useCallback(
    async (phone: string, code: string) => {
      const data = await authApi.otpVerify(phone, code);
      return applyTokens(data);
    },
    [applyTokens],
  );

  const register = useCallback(
    async (body: Record<string, unknown>) => {
      const data = await authApi.register(body);
      return applyTokens(data);
    },
    [applyTokens],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      loginWithPhoneOtp,
      register,
      logout,
      refreshUser,
    }),
    [user, loading, login, loginWithPhoneOtp, register, logout, refreshUser],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useAuthRedirectPath() {
  const { user } = useAuth();
  return user ? homeForUser(user) : '/auth/login';
}

export function RequireAuth({
  roles,
  children,
  loginIntent,
}: {
  roles?: AuthUser['role'][];
  children: React.ReactNode;
  /** Override role-derived login URL when redirecting signed-out users. */
  loginIntent?: LoginIntent | null;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const resolvedIntent =
    loginIntent === undefined ? loginIntentForRoles(roles) : loginIntent;
  const loginHref = resolvedIntent
    ? loginPathForIntent(resolvedIntent)
    : '/auth/login';

  useEffect(() => {
    if (!loading && !user && resolvedIntent) {
      router.replace(loginHref);
    }
  }, [loading, user, resolvedIntent, loginHref, router]);

  if (loading) {
    return <p className="platform-muted">Loading…</p>;
  }
  if (!user) {
    if (resolvedIntent) {
      return <p className="platform-muted">Redirecting to sign in…</p>;
    }
    return (
      <div className="platform-card">
        <p>Please sign in to continue.</p>
        <Link href="/auth/login" className="platform-btn">
          Sign in
        </Link>
      </div>
    );
  }
  if (user.mustChangePassword) {
    return (
      <div className="platform-card">
        <p>
          Your account uses a temporary password. Set a new password to
          continue.
        </p>
        <Link href="/auth/change-password" className="platform-btn">
          Change password
        </Link>
      </div>
    );
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="platform-card platform-error">
        You do not have access to this area.
      </div>
    );
  }
  return <>{children}</>;
}
