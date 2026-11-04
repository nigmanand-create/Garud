'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import {
  notificationsApi,
  type InAppNotification,
} from '@/lib/api/notifications';
import {
  formatBellCount,
  formatRelativeTime,
  safeNotificationHref,
} from '@/lib/platform/notifications';

const POLL_MS = 60_000;

/** Header bell with unread count (polls) and a small dropdown of recent notifications. */
export function NotificationBell() {
  const { user, loading } = useAuth();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InAppNotification[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    notificationsApi
      .unreadCount()
      .then((r) => setCount(r.unreadCount))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (loading || !user) {
      setCount(0);
      setItems([]);
      setOpen(false);
      return;
    }
    refreshCount();
    const timer = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(timer);
  }, [loading, user, refreshCount]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (loading || !user) return null;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      notificationsApi
        .list()
        .then((r) => {
          setItems(r.items);
          setCount(r.unreadCount);
        })
        .catch(() => undefined);
    }
  }

  async function onItem(n: InAppNotification) {
    setOpen(false);
    if (!n.readAt) {
      setCount((c) => Math.max(0, c - 1));
      notificationsApi.markRead(n.id).catch(() => undefined);
    }
  }

  async function markAll() {
    await notificationsApi.markAllRead().catch(() => undefined);
    setCount(0);
    setItems((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    );
  }

  const badge = formatBellCount(count);

  return (
    <div className="platform-bell" ref={wrapRef}>
      <button
        type="button"
        className="header-auth-link header-auth-btn platform-bell-btn"
        aria-label={badge ? `Notifications, ${count} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={toggle}
      >
        <i className="bi bi-bell" aria-hidden />
        {badge && <span className="platform-cart-badge">{badge}</span>}
      </button>
      {open && (
        <div className="platform-bell-panel" role="menu">
          <div className="platform-bell-head">
            <strong>Notifications</strong>
            {count > 0 && (
              <button type="button" className="platform-link-btn" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="platform-bell-empty">You&apos;re all caught up.</p>
          ) : (
            <ul className="platform-bell-list">
              {items.map((n) => {
                const href = safeNotificationHref(n.href);
                const body = (
                  <>
                    <span className="platform-bell-title">{n.title}</span>
                    {n.body && <span className="platform-bell-body">{n.body}</span>}
                    <span className="platform-bell-time">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </>
                );
                return (
                  <li
                    key={n.id}
                    className={n.readAt ? 'platform-bell-item' : 'platform-bell-item is-unread'}
                  >
                    {href ? (
                      <Link href={href} onClick={() => onItem(n)}>
                        {body}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="platform-bell-plain"
                        onClick={() => onItem(n)}
                      >
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
