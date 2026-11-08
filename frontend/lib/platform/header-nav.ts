/**
 * Single source of truth for header CTAs and logged-in account links.
 * Used by `MarketingHeader` (React) and `localizeSnapshotHtml` (legacy snapshot pages)
 * so LOGIN | REGISTER AS B2B PARTNER stays identical on every surface (spec §1.2).
 */

export const HEADER_SIGN_IN_LABEL = 'Sign in';

export const HEADER_LOGIN_CTA = {
  href: '/auth/login',
  label: HEADER_SIGN_IN_LABEL,
} as const;

/** Bookmarkable sign-in URLs per role (same form/API as generic login). */
export const ROLE_LOGIN_LINKS = {
  partner: { href: '/auth/login/partner', label: 'Partner sign in' },
  buyer: { href: '/auth/login/buyer', label: 'Buyer sign in' },
  admin: { href: '/auth/login/admin', label: 'Admin sign in' },
  government: { href: '/auth/login/government', label: 'Government sign in' },
} as const;

/** Header LOGIN CTA: role-specific bookmark on partner/marketplace surfaces. */
export function headerLoginCtaForPath(pathname: string): { href: string; label: string } {
  if (pathname === '/b2b-partners' || pathname.startsWith('/b2b-partners/')) {
    return { href: ROLE_LOGIN_LINKS.partner.href, label: HEADER_SIGN_IN_LABEL };
  }
  if (pathname.startsWith('/marketplace') || pathname.startsWith('/buyer')) {
    return { href: ROLE_LOGIN_LINKS.buyer.href, label: HEADER_SIGN_IN_LABEL };
  }
  if (pathname.startsWith('/government')) {
    return { href: ROLE_LOGIN_LINKS.government.href, label: HEADER_SIGN_IN_LABEL };
  }
  if (pathname.startsWith('/admin')) {
    return { href: ROLE_LOGIN_LINKS.admin.href, label: HEADER_SIGN_IN_LABEL };
  }
  return HEADER_LOGIN_CTA;
}

export const HEADER_REGISTER_PARTNER_CTA = {
  href: '/auth/register?type=partner',
  label: 'Register as partner',
} as const;

export type AccountNavLink = {
  href: string;
  label: string;
  icon: string;
  /** Rendered as the cart link (with live badge) instead of a plain link. */
  cart?: boolean;
};

const BUYER_LINKS: AccountNavLink[] = [
  { href: '/buyer/rfqs', label: 'My RFQs', icon: 'bi-file-earmark-text' },
  { href: '/buyer/orders', label: 'My Orders', icon: 'bi-box-seam' },
  { href: '/buyer/addresses', label: 'Addresses', icon: 'bi-geo-alt' },
  { href: '/buyer/messages', label: 'Messages', icon: 'bi-chat-dots' },
  { href: '/buyer/cart', label: 'Cart', icon: 'bi-cart3', cart: true },
];

const GOVERNMENT_LINKS: AccountNavLink[] = [
  {
    href: '/government/dashboard',
    label: 'Gov · My work',
    icon: 'bi-speedometer2',
  },
  { href: '/government', label: 'Gov opportunities', icon: 'bi-building' },
  ...BUYER_LINKS,
];

const PARTNER_LINKS: AccountNavLink[] = [
  { href: '/partner', label: 'Partner', icon: 'bi-speedometer2' },
  { href: '/partner/rfqs', label: 'B2B RFPs', icon: 'bi-file-earmark-text' },
  { href: '/partner/orders', label: 'Orders', icon: 'bi-box-seam' },
  { href: '/partner/messages', label: 'Messages', icon: 'bi-chat-dots' },
];

const ADMIN_LINKS: AccountNavLink[] = [
  { href: '/admin', label: 'Admin', icon: 'bi-speedometer2' },
  { href: '/admin/orders', label: 'Orders', icon: 'bi-box-seam' },
];

/** Links shown in the header for a signed-in user (no duplicates; buyer/gov get cart). */
export function getAccountNavLinks(role: string | undefined): AccountNavLink[] {
  switch (role) {
    case 'BUYER':
      return BUYER_LINKS;
    case 'GOVERNMENT':
      return GOVERNMENT_LINKS;
    case 'PARTNER':
      return PARTNER_LINKS;
    case 'PLATFORM_ADMIN':
      return ADMIN_LINKS;
    default:
      return [];
  }
}

/** Primary dashboard entry (mobile CTA label). */
export function getDashboardLink(
  role: string | undefined,
): { href: string; label: string } | null {
  if (role === 'PLATFORM_ADMIN') return { href: '/admin', label: 'Admin' };
  if (role === 'PARTNER') return { href: '/partner', label: 'Partner' };
  if (role === 'GOVERNMENT') return { href: '/government/dashboard', label: 'Government' };
  if (role === 'BUYER') {
    return { href: '/buyer/rfqs', label: 'Buyer' };
  }
  return null;
}
