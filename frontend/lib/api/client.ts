import {
  ApiError,
  type ApiErrorBody,
  type AuthTokensResponse,
  type AuthUser,
} from './types';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './auth-storage';

export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? '/platform-api/v1';
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean;
  skipRefresh?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

async function parseError(res: Response): Promise<ApiError> {
  let body: ApiErrorBody = {};
  try {
    body = (await res.json()) as ApiErrorBody;
  } catch {
    body = { message: res.statusText };
  }
  return new ApiError(res.status, body);
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${getApiBase()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    return false;
  }

  const data = (await res.json()) as AuthTokensResponse;
  setTokens(data.accessToken, data.refreshToken);
  return true;
}

async function ensureRefreshed(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = false, skipRefresh = false, headers, ...rest } =
    options;

  const reqHeaders = new Headers(headers);
  if (body !== undefined && !(body instanceof FormData)) {
    reqHeaders.set('Content-Type', 'application/json');
  }
  if (auth) {
    const token = getAccessToken();
    if (token) reqHeaders.set('Authorization', `Bearer ${token}`);
  }

  const init: RequestInit = {
    ...rest,
    headers: reqHeaders,
    body:
      body instanceof FormData
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
  };

  let res = await fetch(`${getApiBase()}${path}`, init);

  if (res.status === 401 && auth && !skipRefresh) {
    const ok = await ensureRefreshed();
    if (ok) {
      const token = getAccessToken();
      if (token) reqHeaders.set('Authorization', `Bearer ${token}`);
      res = await fetch(`${getApiBase()}${path}`, { ...init, headers: reqHeaders });
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function apiDownload(
  path: string,
  filename: string,
): Promise<void> {
  const token = getAccessToken();
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(`${getApiBase()}${path}`, { headers });
  if (res.status === 401) {
    const ok = await ensureRefreshed();
    if (ok) {
      const t = getAccessToken();
      if (t) headers.Authorization = `Bearer ${t}`;
      res = await fetch(`${getApiBase()}${path}`, { headers });
    }
  }
  if (!res.ok) throw await parseError(res);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const authApi = {
  register: (body: Record<string, unknown>) =>
    apiRequest<AuthTokensResponse>('/auth/register', {
      method: 'POST',
      body,
    }),
  login: (email: string, password: string) =>
    apiRequest<AuthTokensResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  logout: () =>
    apiRequest<void>('/auth/logout', {
      method: 'POST',
      auth: true,
      body: { refreshToken: getRefreshToken() },
    }),
  me: () => apiRequest<AuthUser>('/auth/me', { auth: true }),
};
