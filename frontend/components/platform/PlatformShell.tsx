'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { CartNavLink } from './CartNavLink';

const navPublic = [
  { href: '/', label: 'Home' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/auth/login', label: 'Sign in' },
  { href: '/auth/register', label: 'Register' },
];

function dashboardLink(role: string | undefined): { href: string; label: string } | null {
  if (role === 'PLATFORM_ADMIN') return { href: '/admin', label: 'Admin' };
  if (role === 'PARTNER') return { href: '/partner', label: 'Partner' };
  if (role === 'BUYER' || role === 'GOVERNMENT')
    return { href: '/buyer/rfqs', label: 'My RFQs' };
  return null;
}

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const dash = dashboardLink(user?.role);

  return (
    <div className="platform-root">
      <header className="platform-header">
        <div className="platform-header-inner">
          <Link href="/" className="platform-brand">
            GarudHub
          </Link>
          <nav className="platform-nav">
            <Link href="/" className={pathname === '/' ? 'active' : ''}>
              Home
            </Link>
            <Link
              href="/marketplace"
              className={pathname.startsWith('/marketplace') ? 'active' : ''}
            >
              Marketplace
            </Link>
            {dash && (
              <Link
                href={dash.href}
                className={pathname.startsWith(dash.href) ? 'active' : ''}
              >
                {dash.label}
              </Link>
            )}
            {!loading && !user &&
              navPublic.slice(2).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={pathname === item.href ? 'active' : ''}
                >
                  {item.label}
                </Link>
              ))}
            {user && (
              <>
                <CartNavLink />
                <span className="platform-user">{user.email}</span>
                <button type="button" className="platform-link-btn" onClick={() => logout()}>
                  Sign out
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="platform-main">{children}</main>
      <footer className="platform-footer">
        GarudHub B2B platform UI — API-backed features (local dev)
      </footer>
    </div>
  );
}
