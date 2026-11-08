# GarudHub — Route map (living spec ↔ code)

**Updated:** November 6, 2026 (government hub + seeded gov opportunities + list-my-bids API)  
**Spec:** [`DECODE_JWT_SPEC.txt`](./DECODE_JWT_SPEC.txt) · **Open work:** [`PRD_REMAINING_TASKS.md`](./PRD_REMAINING_TASKS.md) · **Code status:** [`CODE_LEVEL_STATUS.md`](./CODE_LEVEL_STATUS.md)

**Maintenance rule:** when you add, move, or retire a route, update this file in the same PR. Source of truth in code:

- React routes: `frontend/app/(platform)/**/page.tsx` (all wrapped by `MarketingShell` via `(platform)/layout.tsx`)
- Legacy snapshots: `frontend/app/[...slug]/route.ts` + `frontend/content/raw/*.html`
- Redirect bridge: `frontend/lib/snapshot-bridge.ts` + `frontend/middleware.ts`
- Header CTAs / account links: `frontend/lib/platform/header-nav.ts`

## Chrome decision (B6 / P-UI-11)

**MarketingShell** remains the default for public and buyer routes. **`PlatformShell`** switches chrome by path/role: `PartnerAppShell` on `/partner`, `AdminAppShell` on `/admin`, and **`GovernmentAppShell`** when the signed-in user is **`GOVERNMENT`** and the path is `/government` or `/government/*` (sidebar + top bar; guests on `/government` still see marketing chrome).

## Spec navigation → routes

Spec main nav: `HOME | ABOUT US | DRONE SERVICES | MARKETPLACE | B2B PARTNERS | JOIN GARUDHUB`, header buttons `LOGIN | REGISTER AS B2B PARTNER`.

| Spec item | Route | Surface | Notes |
|-----------|-------|---------|-------|
| Home | `/` | React | Spec blocks: hero, who we are, ecosystem, 8 services, who can join, why, how it works, industries, register CTA (`lib/platform/home-content.ts`). Old snapshot home no longer served. |
| About us | `/about-us` | React | |
| Drone services (8) | `/services` (`#marketplace`, `#training`, `#compliance`, `#repair`, `#professional`, `#finance`, `#government`, `#recycling`) | React | Legacy per-service snapshot URLs redirect here (see bridge). |
| Service vertical intake | `/services/request?category=REPAIR_AMC\|COMPLIANCE\|PROFESSIONAL\|FINANCE_INSURANCE\|SCRAP_RECYCLING`, `/services/track/[token]` | React | Phase 8 |
| Training courses | `/training`, `/training/[id]` | React | Phase 8 |
| Government tenders & schemes | `/government`, `/government/[id]`, `/government/dashboard` | React | Phase 8. **`GOVERNMENT`:** Account menu includes **Gov · My work** → `/government/dashboard` and **Gov opportunities** → `/government`; mobile “Go to dashboard” uses `/government/dashboard`. **Seeded demo:** `npx prisma db seed` creates published tenders + schemes (references `GARUD-SEED-GOV-*`) so `/government` is not empty. Header listing CTA: `PLATFORM_ADMIN` → `/admin/gov-opportunities`; `BUYER` / `GOVERNMENT` → listing enquiry (`/enquiry`…); signed-out → sign-in with `?next=` to that enquiry. |
| Marketplace | `/marketplace` (`?section=drones\|accessories\|components\|courses\|services`) | React | |
| Marketplace → Vendors | `/marketplace/vendors`, `/marketplace/partners/[orgId]` | React | |
| Marketplace → Listing | `/marketplace/listings/[id]` | React | |
| Marketplace → Compare | `/marketplace/compare?ids=a,b,c` | React | Product compare v1 (max 4, selection in localStorage). |
| Marketplace → Become distributor / dealer | `/marketplace/distributor?type=DISTRIBUTOR\|DEALER&listing=<id>&partner=<orgId>` | React | Creates a DISTRIBUTOR-intent enquiry → partner lead. |
| Marketplace → RFQ | `/buyer/rfqs/new` | React (buyer/gov) | Nav CTA “Post B2B Drone RFQ”. |
| B2B partners | `/b2b-partners` (`#manufacturers`, `#international`, `#dealers`, `#services`, `#training`, `#technology`) | React | |
| Join → Registration | `/auth/register` (`?type=partner` or an account type, e.g. `?type=OEM`) | React | International hints (P-UX-05). |
| Join → Partner login | `/auth/login`, `/auth/login/{partner\|buyer\|admin\|government}` | React | Optional `?next=/internal/path` (stored in `sessionStorage` for email/OTP sign-in and honoured after Google OAuth callback). Users on an admin-issued temporary password are sent to `/auth/change-password`. |
| Contact / enquiry | `/enquiry` (`intent`, `service`, `listing`, `partner`, `subject`, `message`) | React | `/enquiry.php` → 308 `/enquiry`. `message` pre-fills the body (used for government “list this tender” template). |
| Insights & blogs | `/blogging`, `/blogging/post/*`, `/blogging/category/*` | Snapshot | |
| Legal | `/legal.php?page=tos\|privacy\|refund` | Snapshot | |

## Buyer / government (`BUYER`, `GOVERNMENT`)

**`BUYER`** header (desktop + mobile): My RFQs · My Orders · Addresses · Messages · Cart (live badge).

**`GOVERNMENT`** header adds: **Gov · My work** (`/government/dashboard`) · **Gov opportunities** (`/government`), then the same buyer rail as above.

| Route | Purpose |
|-------|---------|
| `/government/dashboard` | “My work”: sealed tender bids (`GET /buyer/gov-opportunities/bids/mine`), shortcuts to opportunities + programme / listing enquiry |
| `/buyer/rfqs`, `/buyer/rfqs/new`, `/buyer/rfqs/[id]` | RFQ list / create / quotes compare + accept |
| `/buyer/cart`, `/buyer/checkout` | Multi-line cart grouped by seller; checkout one seller at a time (`?vendor=`); checkout steps: address → review order → payment |
| `/buyer/addresses` | Saved shipping addresses (address book) for checkout |
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
| `/partner/service-requests` | Matched service-request inbox (accept / decline / complete) + coverage settings |
| `/partner/training` | Institute profile, courses, batches, student leads (training-institute accounts) |

## Admin (`PLATFORM_ADMIN`)

Header: Admin · Orders. Subnav (`AdminSubnav`): Ops Home · Partner Applications · Enquiry Queue · Partner Leads · Service Requests · Gov & Tenders · Partnerships · Listing Moderation · Order Oversight · Commerce Analytics · Partner Billing · Users & Roles · Audit Log.

| Route | Purpose |
|-------|---------|
| `/admin` | Operations home (queue counts, quick links, recent audit activity) |
| `/admin/service-requests` | Service-request oversight (rematch, assign, cancel/complete) |
| `/admin/gov-opportunities` | Tenders / schemes / subsidies CRUD; **Import CSV** panel → `POST …/import` — see [`GOV_TENDER_IMPORT.md`](./GOV_TENDER_IMPORT.md); sample [`/samples/gov-opportunity-import-template.csv`](../frontend/public/samples/gov-opportunity-import-template.csv) |
| `/admin/applications` | KYC applications queue |
| `/admin/leads` | Partner leads oversight (status, note, reroute) |
| `/admin/users` | Admin users & roles (create admin, promote/demote, reset password, disable) |
| `/admin/analytics` | Commerce analytics: GMV trend, order mix, top vendors, RFQ funnel (`GET /admin/analytics`) |
| `/admin/billing` | Partner plans/entitlements, Razorpay plan sync, subscriptions, manual assign (`/admin/billing/*`) |
| `/admin/audit-log` | Global audit log (KYC, listings, partnerships, enquiry routing, user changes) |
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
