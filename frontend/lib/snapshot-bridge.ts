import { HEADER_LOGIN_CTA, HEADER_REGISTER_PARTNER_CTA } from '@/lib/platform/header-nav';

/**
 * Legacy snapshot paths whose direct URL now redirects to a React route (P-UI-12).
 * Link rewrites in `snapshot-html.ts` already point in-page CTAs at the same targets;
 * this map makes direct visits / bookmarks / SEO hits land on the same surface.
 */
export type SnapshotBridgeTarget = { pathname: string; search?: string; hash?: string };

export const SNAPSHOT_REACT_BRIDGE: Record<string, SnapshotBridgeTarget> = {
  '/drone-marketplace': { pathname: '/marketplace' },
  '/drone-accessories': { pathname: '/marketplace', search: '?section=accessories' },
  '/partner-with-us': { pathname: '/b2b-partners' },
  '/drone-training': { pathname: '/services', hash: '#training' },
  '/dgca-compliance': { pathname: '/services', hash: '#compliance' },
  '/repairs-maintenance': { pathname: '/services', hash: '#repair' },
  '/finance-insurance': { pathname: '/services', hash: '#finance' },
  '/government-projects-schemes': { pathname: '/services', hash: '#government' },
  '/scrap-recycling': { pathname: '/services', hash: '#recycling' },
  '/industries-we-serve': { pathname: '/', hash: '#home-industries' },
  '/edp-professional-services': { pathname: '/services', hash: '#professional' },
  '/india-market-entry': { pathname: '/b2b-partners' },
  // NEXT-U1 batch 3 — industry / partner snapshots → React surfaces
  '/about-us': { pathname: '/about-us' },
  '/drone-jobs-career': { pathname: '/services', hash: '#training' },
  '/drone-operations-setup': { pathname: '/services', hash: '#compliance' },
  '/business-setup-in-india': { pathname: '/b2b-partners' },
  '/manufacturing-technology-collaboration': { pathname: '/b2b-partners' },
  '/market-entry-consultancy': { pathname: '/b2b-partners' },
  // NEXT-U1 batch 4 — utility / legal aliases + remaining high-traffic snapshots
  '/enquiry.php': { pathname: '/enquiry' },
  '/loan-calculators.php': { pathname: '/services', hash: '#finance' },
  '/about.php': { pathname: '/about-us' },
  '/blog': { pathname: '/blogging' },
  '/legal/privacy': { pathname: '/legal.php/privacy' },
  '/legal/terms': { pathname: '/legal.php/tos' },
  '/legal/tos': { pathname: '/legal.php/tos' },
  '/legal/refund': { pathname: '/legal.php/refund' },
};

export const SNAPSHOT_BRIDGE_PATHS = Object.keys(SNAPSHOT_REACT_BRIDGE).flatMap((p) => [
  p,
  `${p}/`,
]);

export function resolveSnapshotBridge(pathname: string): SnapshotBridgeTarget | null {
  const key = pathname.replace(/\/+$/, '') || '/';
  return SNAPSHOT_REACT_BRIDGE[key] ?? null;
}

const CTA_STYLE_LOGIN =
  'color:#0f172a;font-weight:600;text-decoration:none;padding:0.45rem 0.6rem;white-space:nowrap;';
const CTA_STYLE_REGISTER =
  'background-color:#1e3a29;color:#ffffff;padding:0.45rem 0.9rem;border-radius:6px;font-weight:600;font-size:0.8125rem;text-decoration:none;white-space:nowrap;display:inline-flex;align-items:center;gap:0.35rem;';

/** Same CTAs as `MarketingHeader`, injected into legacy snapshot headers (spec §1.2). */
export function headerAuthCtasHtml(): string {
  return (
    `<span class="header-auth-links header-auth-links--snapshot" style="display:inline-flex;align-items:center;gap:0.5rem;margin-right:0.75rem;">` +
    `<a href="${HEADER_LOGIN_CTA.href}" class="header-auth-link" style="${CTA_STYLE_LOGIN}">${HEADER_LOGIN_CTA.label}</a>` +
    `<a href="${HEADER_REGISTER_PARTNER_CTA.href}" class="header-auth-link" style="${CTA_STYLE_REGISTER}"><i class="bi bi-patch-check-fill"></i> ${HEADER_REGISTER_PARTNER_CTA.label}</a>` +
    `</span>`
  );
}

const HEADER_CONTACT_CTA = /<a href="\/enquiry"[^>]*class="header-cta header-cta-outline"/g;

/**
 * Prepend LOGIN | REGISTER AS B2B PARTNER before each header "Contact Us" CTA
 * (desktop header and mobile drawer). No-op when the CTA row is absent or already injected.
 */
export function injectSnapshotHeaderCtas(html: string): string {
  if (html.includes('header-auth-links--snapshot')) return html;
  return html.replace(HEADER_CONTACT_CTA, (match) => headerAuthCtasHtml() + match);
}
