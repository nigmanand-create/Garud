'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/platform/AuthProvider';
import { CartNavLink } from '@/components/platform/CartNavLink';
import { NotificationBell } from '@/components/platform/NotificationBell';
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

import {
  getAccountNavLinks,
  getDashboardLink,
  headerLoginCtaForPath,
  HEADER_REGISTER_PARTNER_CTA,
} from '@/lib/platform/header-nav';

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
  const dash = getDashboardLink(user?.role);
  const accountLinks = getAccountNavLinks(user?.role);
  const isBuyer = user?.role === 'BUYER' || user?.role === 'GOVERNMENT';
  const isHome = pathname === '/';
  const isAbout = pathname === '/about-us' || pathname.startsWith('/about');
  const isMarketplace = pathname.startsWith('/marketplace');
  const isBlog = pathname.startsWith('/blogging');
  const loginCta = headerLoginCtaForPath(pathname);

  useEffect(() => {
    const menu = document.getElementById('mobileMenu');
    const backdrop = document.getElementById('mobileBackdrop');
    if (!menu) return;
    const open = menu.classList.contains('active');
    menu.inert = !open;
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    backdrop?.setAttribute('aria-hidden', open ? 'false' : 'true');
  }, [pathname, loading, user]);

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
                  <Link href="/" className="menu-link" style={{ color: '#0f172a', fontWeight: isHome ? 700 : 500 }}>
                    Home
                  </Link>
                </li>
                <li className={`menu-item${isAbout ? ' active' : ''}`}>
                  <Link href="/about-us" className="menu-link" style={{ color: '#0f172a', fontWeight: isAbout ? 700 : 500 }}>
                    About Us
                  </Link>
                </li>
                <li className="menu-item has-dropdown has-mega">
                  <Link href="/services" className="menu-link" style={{ color: '#0f172a' }}>
                    Drone Services <i className="bi bi-chevron-down dropdown-arrow" />
                  </Link>
                  <div
                    className="mega-dropdown mega-contained"
                    style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
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
                    style={{ color: '#0f172a', fontWeight: isMarketplace ? 700 : 500 }}
                    aria-current={isMarketplace ? 'page' : undefined}
                  >
                    Marketplace <i className="bi bi-chevron-down dropdown-arrow" />
                  </Link>
                  <ul className="dropdown-menu" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
                    {MARKETPLACE_LINKS.map((item) => (
                      <li key={item.href} className="dropdown-item">
                        <Link href={item.href} style={{ color: '#334155' }}>
                          <i className={`bi ${item.icon}`} /> {item.label}
                        </Link>
                      </li>
                    ))}
                    <li className="dropdown-item" style={{ borderTop: '1px solid #e2e8f0', marginTop: 4, paddingTop: 6 }}>
                      <Link href="/buyer/rfqs/new" style={{ color: '#e06d00', fontWeight: 600 }}>
                        <i className="bi bi-file-earmark-plus-fill" /> Post B2B Drone RFQ →
                      </Link>
                    </li>
                  </ul>
                </li>
                <li className="menu-item has-dropdown has-mega">
                  <Link href="/b2b-partners" className="menu-link" style={{ color: '#0f172a' }}>
                    B2B Partners <i className="bi bi-chevron-down dropdown-arrow" />
                  </Link>
                  <div
                    className="mega-dropdown mega-contained"
                    style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  >
                    <div className="mega-dropdown-inner">
                      <div className="mega-columns mega-cols-2">
                        <MegaColumn items={PARTNERS_MEGA_COL1} />
                        <MegaColumn items={PARTNERS_MEGA_COL2} />
                      </div>
                    </div>
                  </div>
                </li>
                <li className="menu-item">
                  <Link href="/auth/register" className="menu-link" style={{ color: '#0f172a' }}>
                    Join GarudHub
                  </Link>
                </li>
              </ul>
            </div>

            <div className="header-actions-cluster">
              {!loading && (
                <div className="header-auth-links">
                  {user ? (
                    <>
                      <NotificationBell />
                      {accountLinks.map((item) =>
                        item.cart ? (
                          <CartNavLink key={item.href} />
                        ) : (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="header-auth-link"
                            style={item.href === dash?.href && !isBuyer ? { fontWeight: 600, color: '#1e3a29' } : undefined}
                          >
                            {item.href === dash?.href && !isBuyer && <i className={`bi ${item.icon}`} />}
                            {item.href === dash?.href && !isBuyer ? ' ' : ''}
                            {item.label}
                          </Link>
                        ),
                      )}
                      <span className="header-auth-email" title={user.email}>{user.email}</span>
                      <button type="button" className="header-auth-link header-auth-btn" onClick={() => logout()}>
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href={loginCta.href} className="header-auth-link" style={{ fontWeight: 600 }}>
                        {loginCta.label}
                      </Link>
                      <Link
                        href={HEADER_REGISTER_PARTNER_CTA.href}
                        className="platform-btn platform-btn-cta header-register-cta"
                      >
                        <i className="bi bi-patch-check-fill" aria-hidden /> {HEADER_REGISTER_PARTNER_CTA.label}
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              className="header-mobile-toggle"
              aria-label="Open menu"
              aria-expanded="false"
              aria-controls="mobileMenu"
              type="button"
            >
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>
          </nav>
        </div>
      </header>

      <div className="mobile-backdrop backdrop-blur" id="mobileBackdrop" aria-hidden="true" />
      <div
        className="mobile-menu mobile-menu-drawer drawer-right"
        id="mobileMenu"
        aria-hidden="true"
        inert=""
        style={{ backgroundColor: '#ffffff', width: '85%' }}
      >
        <div className="mobile-menu-header">
          <div className="mobile-menu-logo">
            <Link href="/" className="logo-link">
              <img src={LOGO_URL} alt="GarudHub" className="logo-image" style={{ height: 46 }} />
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
                <i className="bi bi-house-door-fill" style={{ color: '#1e3a29' }} /> Home
              </Link>
            </li>
            <li className={`mobile-menu-item${isAbout ? ' active' : ''}`}>
              <Link href="/about-us" className="mobile-menu-link" style={{ color: '#1a1a1a' }}>
                <i className="bi bi-info-circle-fill" style={{ color: '#1e3a29' }} /> About Us
              </Link>
            </li>
            <li className="mobile-menu-item has-submenu">
              <div className="mobile-menu-parent">
                <Link href="/services" className="mobile-menu-link" style={{ color: '#1a1a1a' }}>
                  <i className="bi bi-grid-fill" style={{ color: '#1e3a29' }} /> Drone Services
                </Link>
                <button className="mobile-submenu-toggle" aria-label="Toggle submenu" type="button" style={{ color: '#1a1a1a' }}>
                  <i className="bi bi-chevron-down" />
                </button>
              </div>
              <ul className="mobile-submenu accordion-submenu">
                {MOBILE_SERVICES_LINKS.map((item) => (
                  <li key={item.href} className="mobile-submenu-item">
                    <Link href={item.href} className="mobile-submenu-link" style={{ color: '#1a1a1a' }}>
                      <i className={`bi ${item.icon}`} style={{ color: '#1e3a29' }} /> {item.label}
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
                  <i className="bi bi-shop" style={{ color: '#1e3a29' }} /> Marketplace
                </Link>
                <button className="mobile-submenu-toggle" aria-label="Toggle submenu" type="button" style={{ color: '#1a1a1a' }}>
                  <i className="bi bi-chevron-down" />
                </button>
              </div>
              <ul className="mobile-submenu accordion-submenu">
                {MARKETPLACE_LINKS.map((item) => (
                  <li key={item.href} className="mobile-submenu-item">
                    <Link href={item.href} className="mobile-submenu-link" style={{ color: '#1a1a1a' }}>
                      <i className={`bi ${item.icon}`} style={{ color: '#1e3a29' }} /> {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            <li className="mobile-menu-item has-submenu">
              <div className="mobile-menu-parent">
                <Link href="/b2b-partners" className="mobile-menu-link" style={{ color: '#1a1a1a' }}>
                  <i className="bi bi-globe2" style={{ color: '#1e3a29' }} /> B2B Partners
                </Link>
                <button className="mobile-submenu-toggle" aria-label="Toggle submenu" type="button" style={{ color: '#1a1a1a' }}>
                  <i className="bi bi-chevron-down" />
                </button>
              </div>
              <ul className="mobile-submenu accordion-submenu">
                {MOBILE_PARTNERS_LINKS.map((item) => (
                  <li key={item.href} className="mobile-submenu-item">
                    <Link href={item.href} className="mobile-submenu-link" style={{ color: '#1a1a1a' }}>
                      <i className={`bi ${item.icon}`} style={{ color: '#1e3a29' }} /> {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            <li className="mobile-menu-item">
              <Link href="/auth/register" className="mobile-menu-link" style={{ color: '#1a1a1a' }}>
                <i className="bi bi-person-plus-fill" style={{ color: '#1e3a29' }} /> Join GarudHub
              </Link>
            </li>
          </ul>
        </nav>
        <div className="mobile-menu-cta">
          {!loading && !user && (
            <div className="mobile-auth-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link
                href={HEADER_REGISTER_PARTNER_CTA.href}
                className="platform-btn platform-btn-cta platform-btn-full"
                style={{ textAlign: 'center', textDecoration: 'none' }}
              >
                {HEADER_REGISTER_PARTNER_CTA.label}
              </Link>
              <Link
                href={loginCta.href}
                className="platform-btn platform-btn-secondary platform-btn-full"
                style={{ textAlign: 'center', textDecoration: 'none' }}
              >
                {loginCta.label}
              </Link>
            </div>
          )}
          {user && dash && (
            <Link href={dash.href} className="platform-btn platform-btn-cta platform-btn-full" style={{ display: 'block', textAlign: 'center', marginBottom: '0.5rem', textDecoration: 'none' }}>
              Go to {dash.label} Dashboard
            </Link>
          )}
          {user && (
            <div
              className="mobile-auth-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <NotificationBell />
            </div>
          )}
          {user && accountLinks.length > 0 && (
            <div className="mobile-auth-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {accountLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="platform-btn platform-btn-secondary"
                  style={{ flex: '1 1 40%', textAlign: 'center', textDecoration: 'none' }}
                >
                  <i className={`bi ${item.icon}`} /> {item.label}
                </Link>
              ))}
              <button type="button" className="platform-btn platform-btn-secondary" style={{ flex: '1 1 100%' }} onClick={() => logout()}>
                Sign out ({user.email})
              </button>
            </div>
          )}
          <Link
            href="/enquiry"
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
