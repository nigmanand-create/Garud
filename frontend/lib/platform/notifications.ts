/** Pure helpers for the in-app notification bell (unit-tested). */

export function formatBellCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return '';
  return count > 99 ? '99+' : String(Math.trunc(count));
}

/** Short relative time ("just now", "5m ago", "3h ago", "2d ago", else a date). */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffSec = Math.max(0, Math.floor((now.getTime() - t) / 1000));
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86_400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 7 * 86_400) return `${Math.floor(diffSec / 86_400)}d ago`;
  return new Date(t).toLocaleDateString();
}

/** Only same-origin app paths may be used as notification deep links. */
export function safeNotificationHref(href: string | null | undefined): string | null {
  if (!href || !href.startsWith('/') || href.startsWith('//')) return null;
  return href;
}

export type EnquiryExportFilters = {
  status?: string;
  intent?: string;
  routing?: string;
};

export function buildEnquiryExportPath(filters: EnquiryExportFilters = {}): string {
  const search = new URLSearchParams();
  if (filters.status) search.set('status', filters.status);
  if (filters.intent) search.set('intent', filters.intent);
  if (filters.routing) search.set('routing', filters.routing);
  const q = search.toString();
  return `/admin/enquiries/export${q ? `?${q}` : ''}`;
}
