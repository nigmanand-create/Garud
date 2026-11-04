import { describe, expect, it } from 'vitest';
import {
  buildEnquiryExportPath,
  formatBellCount,
  formatRelativeTime,
  safeNotificationHref,
} from '../platform/notifications';

describe('notification bell helpers', () => {
  it('formats the unread badge', () => {
    expect(formatBellCount(0)).toBe('');
    expect(formatBellCount(-2)).toBe('');
    expect(formatBellCount(7)).toBe('7');
    expect(formatBellCount(120)).toBe('99+');
  });

  it('formats relative time', () => {
    const now = new Date('2026-11-04T12:00:00Z');
    expect(formatRelativeTime('2026-11-04T11:59:40Z', now)).toBe('just now');
    expect(formatRelativeTime('2026-11-04T11:55:00Z', now)).toBe('5m ago');
    expect(formatRelativeTime('2026-11-04T09:00:00Z', now)).toBe('3h ago');
    expect(formatRelativeTime('2026-11-02T12:00:00Z', now)).toBe('2d ago');
    expect(formatRelativeTime('garbage', now)).toBe('');
  });

  it('only allows same-origin deep links', () => {
    expect(safeNotificationHref('/partner/enquiries')).toBe('/partner/enquiries');
    expect(safeNotificationHref('//evil.com')).toBeNull();
    expect(safeNotificationHref('https://evil.com')).toBeNull();
    expect(safeNotificationHref(null)).toBeNull();
  });

  it('builds the CRM export path from active filters', () => {
    expect(buildEnquiryExportPath()).toBe('/admin/enquiries/export');
    expect(buildEnquiryExportPath({ status: 'NEW', routing: 'UNROUTED' })).toBe(
      '/admin/enquiries/export?status=NEW&routing=UNROUTED',
    );
  });
});
