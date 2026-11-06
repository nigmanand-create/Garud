'use client';

import Link from 'next/link';
import { useAuth } from '@/components/platform/AuthProvider';
import { NotificationBell } from '@/components/platform/NotificationBell';
import { PartnerSidebarNav } from '@/components/platform/PartnerSidebarNav';
import { LOGO_URL } from '@/components/marketing/marketing-site';
import { DroneAssistantWidget } from '@/components/assistant/DroneAssistantWidget';

export function PartnerAppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="platform-partner-app page-platform">
      <a className="visually-hidden-focusable" href="#main-content">
        Skip to main content
      </a>
      <header className="platform-partner-app-topbar">
        <div className="platform-partner-app-topbar-inner">
          <div className="platform-partner-app-topbar-brand">
            <Link href="/partner" className="platform-partner-app-logo">
              <img src={LOGO_URL} alt="" width={36} height={36} />
              <span>
                <strong>Partner Hub</strong>
                <span className="platform-partner-app-logo-sub">GarudHub B2B</span>
              </span>
            </Link>
          </div>
          <div className="platform-partner-app-topbar-actions">
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
              <Link href="/auth/login/partner" className="platform-btn platform-btn-sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <div className="platform-partner-app-frame">
        <aside className="platform-partner-app-sidebar">
          <PartnerSidebarNav />
        </aside>
        <main className="platform-partner-app-main" id="main-content" role="main">
          <div className="platform-partner-app-main-inner">{children}</div>
        </main>
      </div>
      <DroneAssistantWidget />
    </div>
  );
}
