'use client';

import Link from 'next/link';
import { useAuth } from '@/components/platform/AuthProvider';
import { GovernmentSidebarNav } from '@/components/platform/GovernmentSidebarNav';
import { NotificationBell } from '@/components/platform/NotificationBell';
import { LOGO_URL } from '@/components/marketing/marketing-site';
import { DroneAssistantWidget } from '@/components/assistant/DroneAssistantWidget';

/**
 * Focused chrome for GOVERNMENT users on `/government` journeys (sidebar + top bar).
 * Guests and other roles still use MarketingShell on these URLs.
 */
export function GovernmentAppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="platform-partner-app page-platform">
      <a className="visually-hidden-focusable" href="#main-content">
        Skip to main content
      </a>
      <header className="platform-partner-app-topbar">
        <div className="platform-partner-app-topbar-inner">
          <div className="platform-partner-app-topbar-brand">
            <Link href="/government/dashboard" className="platform-partner-app-logo">
              <img src={LOGO_URL} alt="" width={36} height={36} />
              <span>
                <strong>Government hub</strong>
                <span className="platform-partner-app-logo-sub">GarudHub</span>
              </span>
            </Link>
          </div>
          <div className="platform-partner-app-topbar-actions">
            <Link href="/government" className="platform-partner-app-topbar-link">
              <i className="bi bi-list-ul" aria-hidden /> Opportunities
            </Link>
            <Link href="/marketplace" className="platform-partner-app-topbar-link">
              <i className="bi bi-shop" aria-hidden /> Marketplace
            </Link>
            {user ? <NotificationBell /> : null}
            {user ? (
              <div className="platform-partner-app-account">
                <span className="platform-partner-app-account-email" title={user.email}>
                  {user.email}
                </span>
                <button type="button" className="platform-btn platform-btn-sm" onClick={() => void logout()}>
                  Sign out
                </button>
              </div>
            ) : (
              <Link href="/auth/login/government" className="platform-btn platform-btn-sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <div className="platform-partner-app-frame">
        <aside className="platform-partner-app-sidebar">
          <GovernmentSidebarNav />
        </aside>
        <main className="platform-partner-app-main" id="main-content" role="main">
          <div className="platform-partner-app-main-inner">{children}</div>
        </main>
      </div>
      <DroneAssistantWidget />
    </div>
  );
}
