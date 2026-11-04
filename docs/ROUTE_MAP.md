# GarudHub — Route map (living spec ↔ code)

**Updated:** November 4, 2026 (PRD Phase 3)  
**Spec:** [`DECODE_JWT_SPEC.txt`](./DECODE_JWT_SPEC.txt) · **Open work:** [`PRD_REMAINING_TASKS.md`](./PRD_REMAINING_TASKS.md) · **Code status:** [`CODE_LEVEL_STATUS.md`](./CODE_LEVEL_STATUS.md)

**Maintenance rule:** when you add, move, or retire a route, update this file in the same PR. Source of truth in code:

- React routes: `frontend/app/(platform)/**/page.tsx` (all wrapped by `MarketingShell` via `(platform)/layout.tsx`)
- Legacy snapshots: `frontend/app/[...slug]/route.ts` + `frontend/content/raw/*.html`
- Redirect bridge: `frontend/lib/snapshot-bridge.ts` + `frontend/middleware.ts`
- Header CTAs / account links: `frontend/lib/platform/header-nav.ts`

## Chrome decision (B6 / P-UI-11)

**Decision: keep `MarketingShell` (marketing header + footer) for every React route** — public, partner, buyer, and admin. `PlatformShell` was never imported and carried “local dev” footer copy; it has been **deleted**. Partner pages add `PartnerPageShell` subnav; admin uses `AdminSubnav`.

## Spec navigation → routes

Spec main nav: `HOME | ABOUT US | DRONE SERVICES | MARKETPLACE | B2B PARTNERS | JOIN GARUDHUB`, header buttons `LOGIN | REGISTER AS B2B PARTNER`.

| Spec item | Route | Surface | Notes |
|-----------|-------|---------|-------|
| Home | `/` | React | Spec blocks: hero, who we are, ecosystem, 8 services, who can join, why, how it works, industries, register CTA (`lib/platform/home-content.ts`). Old snapshot home no longer served. |
| About us | `/about-us` | React | |
| Drone services (8) | `/services` (`#marketplace`, `#training`, `#compliance`, `#repair`, `#professional`, `#finance`, `#government`, `#recycling`) | React | Legacy per-service snapshot URLs redirect here (see bridge). |
| Marketplace | `/marketplace` (`?section=drones\|accessories\|components\|courses\|services`) | React | |
| Marketplace → Vendors | `/marketplace/vendors`, `/marketplace/partners/[orgId]` | React | |
| Marketplace → Listing | `/marketplace/listings/[id]` | React | |
| Marketplace → Compare | `/marketplace/compare?ids=a,b,c` | React | Product compare v1 (max 4, selection in localStorage). |
| Marketplace → Become distributor / dealer | `/marketplace/distributor?type=DISTRIBUTOR\|DEALER&listing=<id>&partner=<orgId>` | React | Creates a DISTRIBUTOR-intent enquiry → partner lead. |
| Marketplace → RFQ | `/buyer/rfqs/new` | React (buyer/gov) | Nav CTA “Post B2B Drone RFQ”. |
| B2B partners | `/b2b-partners` (`#manufacturers`, `#international`, `#dealers`, `#services`, `#training`, `#technology`) | React | |
| Join → Registration | `/auth/register` (`?type=partner` or an account type, e.g. `?type=OEM`) | React | International hints (P-UX-05). |
| Join → Partner login | `/auth/login` | React | |
| Contact / enquiry | `/enquiry` (`intent`, `service`, `listing`, `partner`, `subject`) | React | `/enquiry.php` → 308 `/enquiry`. |
| Insights & blogs | `/blogging`, `/blogging/post/*`, `/blogging/category/*` | Snapshot | |
| Legal | `/legal.php?page=tos\|privacy\|refund` | Snapshot | |

## Buyer / government (`BUYER`, `GOVERNMENT`)

Header (desktop + mobile): My RFQs · My Orders · Messages · Cart (live badge).

| Route | Purpose |
|-------|---------|
| `/buyer/rfqs`, `/buyer/rfqs/new`, `/buyer/rfqs/[id]` | RFQ list / create / quotes compare + accept |
| `/buyer/cart`, `/buyer/checkout` | Single-vendor cart and checkout |
| `/buyer/orders`, `/buyer/orders/[id]` | Orders + payment + tracking |
| `/buyer/messages` | Supplier threads |

## Partner (`PARTNER`)

Header: Partner (dashboard) · B2B RFPs · Orders · Messages. Dashboard subnav covers the rest.

| Route | Purpose |
|-------|---------|
| `/partner` | Dashboard + onboarding checklist |
| `/partner/application`, `/partner/documents` | Company profile + KYC docs |
| `/partner/catalog`, `/partner/catalog/new`, `/partner/catalog/[id]` | Listings |
| `/partner/leads`, `/partner/enquiries`, `/partner/messages`, `/partner/activity` | Lead loop |
| `/partner/rfqs`, `/partner/rfqs/[id]` | RFQ invites + quotes |
| `/partner/orders`, `/partner/orders/[id]` | Fulfilment |
| `/partner/analytics`, `/partner/subscription`, `/partner/services`, `/partner/partnerships` | Dashboard modules |

## Admin (`PLATFORM_ADMIN`)

Header: Admin · Orders.

| Route | Purpose |
|-------|---------|
| `/admin` | KYC applications queue |
| `/admin/applications/[id]` | KYC detail |
| `/admin/listings`, `/admin/listings/[id]` | Listing moderation |
| `/admin/orders`, `/admin/orders/[id]` | Orders; `/admin/orders/[id]/cancel` and `/payment` redirect to detail |
| `/admin/enquiries` | Enquiry triage |
| `/admin/partnerships` | Partnership request moderation |

## Legacy snapshot bridge (P-UI-12)

Direct visits to these snapshot slugs now redirect (307) to the React surface; in-page CTAs on remaining snapshots are rewritten to the same targets by `snapshot-html.ts`.

| Legacy path | Redirects to |
|-------------|--------------|
| `/drone-marketplace` | `/marketplace` |
| `/drone-accessories` | `/marketplace?section=accessories` |
| `/partner-with-us` | `/b2b-partners` |
| `/drone-training` | `/services#training` |
| `/dgca-compliance` | `/services#compliance` |
| `/repairs-maintenance` | `/services#repair` |
| `/finance-insurance` | `/services#finance` |
| `/enquiry.php` | `/enquiry` (308) |
| `/about.php` | `/about-us` |

All other snapshot pages (`/industries-we-serve`, `/edp-professional-services`, `/scrap-recycling`, `/drone-jobs-career`, `/government-projects-schemes`, `/india-market-entry`, `/market-entry-consultancy`, `/business-setup-in-india`, `/drone-operations-setup`, `/manufacturing-technology-collaboration`, `/loan-calculators.php`, blog, legal) are still served as HTML snapshots with the **legacy header**, into which LOGIN + REGISTER AS B2B PARTNER CTAs are injected (`injectSnapshotHeaderCtas`). Snapshot headers cannot show auth state or cart; logged-in buyers see those on React routes only.

## Proxies & non-page routes

| Route | Purpose |
|-------|---------|
| `/platform-api/v1/*` | Next → NestJS API proxy |
| `/api/*` | Rewrite to legacy `garudhub.com/api/*` (snapshot assets) |
