'use client';

import Link from 'next/link';
import { useAuth, RequireAuth } from '@/components/platform/AuthProvider';
import { NotificationBell } from '@/components/platform/NotificationBell';
import { AdminSidebarNav } from '@/components/platform/AdminSidebarNav';
import { LOGO_URL } from '@/components/marketing/marketing-site';

function AdminAppChrome({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="platform-admin-app page-platform">
      <a className="visually-hidden-focusable" href="#main-content">
        Skip to main content
      </a>
      <header className="platform-admin-app-topbar">
        <div className="platform-admin-app-topbar-inner">
          <div className="platform-admin-app-topbar-brand">
            <Link href="/admin" className="platform-admin-app-logo-mark" aria-label="Admin home">
              <img src={LOGO_URL} alt="" width={36} height={36} />
            </Link>
            <div className="platform-admin-app-logo-text">
              <span className="platform-admin-app-logo-title">Operations Console</span>
              <span className="platform-admin-app-logo-sub">GarudHub Admin</span>
            </div>
          </div>
          <div className="platform-admin-app-topbar-actions">
            <Link href="/marketplace" className="platform-admin-app-topbar-link">
              <i className="bi bi-shop" aria-hidden /> Marketplace
            </Link>
            {user ? <NotificationBell /> : null}
            {user ? (
              <div className="platform-admin-app-account">
                <span className="platform-admin-app-account-email" title={user.email}>
                  {user.email}
                </span>
                <button type="button" className="platform-btn platform-btn-sm" onClick={() => void logout()}>
                  Sign out
                </button>
              </div>
            ) : (
              <Link href="/auth/login/admin" className="platform-btn platform-btn-sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <div className="platform-admin-app-frame">
        <aside className="platform-admin-app-sidebar">
          <AdminSidebarNav />
        </aside>
        <main className="platform-admin-app-main" id="main-content" role="main">
          <div className="platform-admin-app-main-inner">{children}</div>
        </main>
      </div>
    </div>
  );
}

/** Focused admin hub chrome (no marketing header/footer). */
export function AdminAppShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={['PLATFORM_ADMIN']} loginIntent="admin">
      <AdminAppChrome>{children}</AdminAppChrome>
    </RequireAuth>
  );
}
