'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/platform/AuthProvider';
import { CartNavLink } from '@/components/platform/CartNavLink';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  LOGO_URL,
  MARKETPLACE_LINKS,
  MOBILE_PARTNERS_LINKS,
  MOBILE_SERVICES_LINKS,
  PARTNERS_MEGA_COL1,
  PARTNERS_MEGA_COL2,
  SERVICES_MEGA_COL1,
  SERVICES_MEGA_COL2,
} from '@/components/marketing/marketing-site';

function dashboardLink(role: string | undefined): { href: string; label: string } | null {
  if (role === 'PLATFORM_ADMIN') return { href: '/admin', label: 'Admin' };
  if (role === 'PARTNER') return { href: '/partner', label: 'Partner' };
  if (role === 'BUYER' || role === 'GOVERNMENT')
    return { href: '/buyer/rfqs', label: 'My RFQs' };
  return null;
}

function MegaColumn({
  items,
}: {
  items: { href: string; icon: string; label: string }[];
}) {
  return (
    <div className="mega-column">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="mega-link">
          <span className="mega-link-icon" style={{ color: '#3b82f6' }}>
            <i className={`bi ${item.icon}`} />
          </span>
          <span className="mega-link-content">
            <span className="mega-link-title" style={{ color: '#4b5563' }}>
              {item.label}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function MarketingHeader() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const dash = dashboardLink(user?.role);
  const isHome = pathname === '/';
  const isAbout = pathname === '/about-us' || pathname.startsWith('/about');
  const isMarketplace = pathname.startsWith('/marketplace');
  const isBlog = pathname.startsWith('/blogging');

  return (
    <>
      <div className="header-topbar" style={{ backgroundColor: '#2f5233', color: '#ffffff' }}>
        <div className="container">
          <div className="header-topbar-inner">
            <div className="header-topbar-left">
              <div className="topbar-social" />
            </div>
            <div className="header-topbar-right">
              <a href={`mailto:${CONTACT_EMAIL}`} className="topbar-item" style={{ color: '#ffffff' }}>
                <i className="bi bi-envelope" /> {CONTACT_EMAIL}
              </a>
              <a href={`tel:${CONTACT_PHONE}`} className="topbar-item" style={{ color: '#ffffff' }}>
                <i className="bi bi-telephone" /> {CONTACT_PHONE}
              </a>
            </div>
          </div>
        </div>
      </div>

      <header
        className="header-desktop header-mega header-sticky header-shadow"
        style={{ backgroundColor: '#ffffff' }}
      >
        <div className="container">
          <nav className="header-nav">
            <div className="header-logo">
              <Link href="/" className="logo-link">
                <img src={LOGO_URL} alt="DroneHub" className="logo-image" style={{ height: 50 }} />
              </Link>
            </div>
            <div className="header-menu">
              <ul className="header-menu-list">
                <li className={`menu-item${isHome ? ' active' : ''}`}>
                  <Link href="/" className="menu-link" style={{ color: '#000000' }}>
                    Home
                  </Link>
                </li>
                <li className={`menu-item${isAbout ? ' active' : ''}`}>
                  <Link href="/about-us" className="menu-link" style={{ color: '#000000' }}>
                    About-Us
                  </Link>
                </li>
                <li className="menu-item has-dropdown has-mega">
                  <a href="#" className="menu-link" style={{ color: '#000000' }}>
                    Services <i className="bi bi-chevron-down dropdown-arrow" />
                  </a>
                  <div
                    className="mega-dropdown mega-contained"
                    style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
                  >
                    <div className="mega-dropdown-inner">
                      <div className="mega-columns mega-cols-2">
                        <MegaColumn items={SERVICES_MEGA_COL1} />
                        <MegaColumn items={SERVICES_MEGA_COL2} />
                      </div>
                    </div>
                  </div>
                </li>
                <li className={`menu-item has-dropdown${isMarketplace ? ' active' : ''}`}>
                  <Link
                    href="/marketplace"
                    className="menu-link"
                    style={{ color: '#000000' }}
                    aria-current={isMarketplace ? 'page' : undefined}
                  >
                    Marketplace <i className="bi bi-chevron-down dropdown-arrow" />
                  </Link>
                  <ul className="dropdown-menu" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
                    {MARKETPLACE_LINKS.map((item) => (
                      <li key={item.href} className="dropdown-item">
                        <Link href={item.href} style={{ color: '#4b5563' }}>
                          <i className={`bi ${item.icon}`} /> {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
                <li className="menu-item has-dropdown has-mega">
                  <a href="#" className="menu-link" style={{ color: '#000000' }}>
                    Partners <i className="bi bi-chevron-down dropdown-arrow" />
                  </a>
                  <div
                    className="mega-dropdown mega-contained"
                    style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
                  >
                    <div className="mega-dropdown-inner">
                      <div className="mega-columns mega-cols-2">
                        <MegaColumn items={PARTNERS_MEGA_COL1} />
                        <MegaColumn items={PARTNERS_MEGA_COL2} />
                      </div>
                    </div>
                  </div>
                </li>
                <li className={`menu-item${isBlog ? ' active' : ''}`}>
                  <Link href="/blogging" className="menu-link" style={{ color: '#000000' }}>
                    Insights &amp; Blogs
                  </Link>
                </li>
              </ul>
            </div>

            <div className="header-actions-cluster">
              {!loading && (
                <div className="header-auth-links">
                  {user ? (
                    <>
                      <CartNavLink className="header-auth-link platform-cart-nav" />
                      {dash && (
                        <Link href={dash.href} className="header-auth-link">
                          {dash.label}
                        </Link>
                      )}
                      {(user.role === 'BUYER' || user.role === 'GOVERNMENT') && (
                        <Link href="/buyer/orders" className="header-auth-link">
                          My Orders
                        </Link>
                      )}
                      <span className="header-auth-email">{user.email}</span>
                      <button type="button" className="header-auth-link header-auth-btn" onClick={() => logout()}>
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/auth/login" className="header-auth-link">Sign in</Link>
                      <Link href="/auth/register" className="header-auth-link header-auth-link-accent">
                        Register
                      </Link>
                    </>
                  )}
                </div>
              )}
              <Link
                href="/enquiry.php"
                className="header-cta header-cta-outline"
                style={{
                  backgroundColor: 'transparent',
                  color: '#e06d00',
                  borderColor: '#e06d00',
                }}
              >
                <i className="bi bi-send-fill" /> Contact Us
              </Link>
            </div>

            <button className="header-mobile-toggle" aria-label="Open menu" type="button">
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>
          </nav>
        </div>
      </header>

      <div className="mobile-backdrop backdrop-blur" id="mobileBackdrop" />
      <div
        className="mobile-menu mobile-menu-drawer drawer-right"
        id="mobileMenu"
        style={{ backgroundColor: '#ffffff', width: '85%' }}
      >
        <div className="mobile-menu-header">
          <div className="mobile-menu-logo">
            <Link href="/" className="logo-link">
              <img src={LOGO_URL} alt="DroneHub" className="logo-image" style={{ height: 50 }} />
            </Link>
          </div>
          <button className="mobile-menu-close" aria-label="Close menu" type="button" style={{ color: '#1a1a1a' }}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <nav className="mobile-menu-nav">
          <ul className="mobile-menu-list">
            <li className={`mobile-menu-item${isHome ? ' active' : ''}`}>
              <Link href="/" className="mobile-menu-link" style={{ color: '#1a1a1a' }}>
                <i className="bi bi-house-door-fill" style={{ color: '#3b82f6' }} /> Home
              </Link>
            </li>
            <li className={`mobile-menu-item${isAbout ? ' active' : ''}`}>
              <Link href="/about-us" className="mobile-menu-link" style={{ color: '#1a1a1a' }}>
                <i className="bi bi-info-circle-fill" style={{ color: '#3b82f6' }} /> About-Us
              </Link>
            </li>
            <li className="mobile-menu-item has-submenu">
              <div className="mobile-menu-parent">
                <a href="#" className="mobile-menu-link" style={{ color: '#1a1a1a' }}>
                  <i className="bi bi-grid-fill" style={{ color: '#3b82f6' }} /> Services
                </a>
                <button className="mobile-submenu-toggle" aria-label="Toggle submenu" type="button" style={{ color: '#1a1a1a' }}>
                  <i className="bi bi-chevron-down" />
                </button>
              </div>
              <ul className="mobile-submenu accordion-submenu">
                {MOBILE_SERVICES_LINKS.map((item) => (
                  <li key={item.href} className="mobile-submenu-item">
                    <Link href={item.href} className="mobile-submenu-link" style={{ color: '#1a1a1a' }}>
                      <i className={`bi ${item.icon}`} style={{ color: '#3b82f6' }} /> {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            <li className={`mobile-menu-item has-submenu${isMarketplace ? ' active' : ''}`}>
              <div className="mobile-menu-parent">
                <Link
                  href="/marketplace"
                  className="mobile-menu-link"
                  style={{ color: '#1a1a1a' }}
                  aria-current={isMarketplace ? 'page' : undefined}
                >
                  <i className="bi bi-shop" style={{ color: '#3b82f6' }} /> Marketplace
                </Link>
                <button className="mobile-submenu-toggle" aria-label="Toggle submenu" type="button" style={{ color: '#1a1a1a' }}>
                  <i className="bi bi-chevron-down" />
                </button>
              </div>
              <ul className="mobile-submenu accordion-submenu">
                {MARKETPLACE_LINKS.map((item) => (
                  <li key={item.href} className="mobile-submenu-item">
                    <Link href={item.href} className="mobile-submenu-link" style={{ color: '#1a1a1a' }}>
                      <i className={`bi ${item.icon}`} style={{ color: '#3b82f6' }} /> {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            <li className="mobile-menu-item has-submenu">
              <div className="mobile-menu-parent">
                <a href="#" className="mobile-menu-link" style={{ color: '#1a1a1a' }}>
                  <i className="bi bi-person-circle" style={{ color: '#3b82f6' }} /> Partners
                </a>
                <button className="mobile-submenu-toggle" aria-label="Toggle submenu" type="button" style={{ color: '#1a1a1a' }}>
                  <i className="bi bi-chevron-down" />
                </button>
              </div>
              <ul className="mobile-submenu accordion-submenu">
                {MOBILE_PARTNERS_LINKS.map((item) => (
                  <li key={item.href} className="mobile-submenu-item">
                    <Link href={item.href} className="mobile-submenu-link" style={{ color: '#1a1a1a' }}>
                      <i className={`bi ${item.icon}`} style={{ color: '#3b82f6' }} /> {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            <li className={`mobile-menu-item${isBlog ? ' active' : ''}`}>
              <Link href="/blogging" className="mobile-menu-link" style={{ color: '#1a1a1a' }}>
                <i className="bi bi-journal-richtext" style={{ color: '#3b82f6' }} /> Insights &amp; Blogs
              </Link>
            </li>
          </ul>
        </nav>
        <div className="mobile-menu-cta">
          {!loading && !user && (
            <div className="mobile-auth-row">
              <Link href="/auth/login" className="header-auth-link">Sign in</Link>
              <Link href="/auth/register" className="header-auth-link header-auth-link-accent">
                Register
              </Link>
            </div>
          )}
          {user && dash && (
            <Link href={dash.href} className="header-auth-link mobile-dash-link">
              {dash.label}
            </Link>
          )}
          <Link
            href="/enquiry.php"
            className="header-cta header-cta-outline"
            style={{
              backgroundColor: 'transparent',
              color: '#e06d00',
              borderColor: '#e06d00',
            }}
          >
            <i className="bi bi-send-fill" /> Contact Us
          </Link>
        </div>
        <div className="mobile-menu-footer">
          <div className="mobile-menu-contact">
            <a href={`tel:${CONTACT_PHONE}`} className="mobile-contact-btn" style={{ backgroundColor: '#3b82f6', color: '#fff' }}>
              <i className="bi bi-telephone" /> Call Now
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mobile-contact-btn mobile-contact-btn-outline"
              style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
            >
              <i className="bi bi-envelope" /> Email
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
