/** Client-only helpers for ?next= after sign-in (sessionStorage survives OAuth round-trip). */

const STORAGE_KEY = 'garud_post_login_next';

function isSafeInternalPath(path: string): boolean {
  if (path.length < 1 || path.length > 2048) return false;
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  // Disallow scheme-relative or absolute URLs accidentally passed as paths
  if (path.includes('://')) return false;
  return true;
}

/** Persist a validated internal path for use after login / OAuth callback. */
export function rememberPostLoginNext(path: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  if (!path || !isSafeInternalPath(path)) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Read and clear stored next path; returns null if missing or unsafe. */
export function consumePostLoginNext(): string | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return isSafeInternalPath(raw) ? raw : null;
}

export function clearPostLoginNext(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
