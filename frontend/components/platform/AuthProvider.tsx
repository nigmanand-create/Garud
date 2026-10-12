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
import { clearTokens, getAccessToken, setTokens } from '@/lib/api/auth-storage';
import type { AuthTokensResponse, AuthUser } from '@/lib/api/types';

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (body: Record<string, unknown>) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function homeForUser(user: AuthUser): string {
  if (user.role === 'PLATFORM_ADMIN') return '/admin';
  if (user.role === 'PARTNER') return '/partner';
  return '/buyer/rfqs';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applyTokens = useCallback((data: AuthTokensResponse) => {
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      return;
    }
    try {
      const me = await authApi.me();
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
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser],
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
}: {
  roles?: AuthUser['role'][];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="platform-muted">Loading…</p>;
  }
  if (!user) {
    return (
      <div className="platform-card">
        <p>Please sign in to continue.</p>
        <a href="/auth/login" className="platform-btn">
          Sign in
        </a>
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
