const ACCESS_KEY = 'garud_access_token';
const REFRESH_KEY = 'garud_refresh_token';

/** Default: httpOnly cookies via same-origin `/platform-api` proxy (P1-1). */
export function usesCookieSession(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_SESSION !== 'bearer';
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined' || usesCookieSession()) return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined' || usesCookieSession()) return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (usesCookieSession()) return;
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
