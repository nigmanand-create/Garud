# GarudHub UX/UI Audit Report

**Date:** 5 November 2026  
**Environment:** `http://localhost:3001` (Next.js dev, live browser pass)  
**Viewports tested:** 390×844 (mobile), 768×1024 (tablet), 1280×800 (desktop) via Cursor IDE Browser (CDP emulation)  
**Pages:** `/`, `/marketplace`, `/b2b-partners`, `/auth/login/partner`, `/auth/login/buyer`, `/enquiry`, `/services`, `/about-us`, `/buyer/rfqs` (unauthenticated)

**Screenshots:** Browser MCP captured mobile hero (`/` and `/marketplace`); additional screenshots intermittently timed out. Findings below combine accessibility snapshots, DOM probes (horizontal scroll, menu state), and code review.

---

## Executive summary

GarudHub presents **strong B2B messaging and a shared marketing shell** (header/footer, “Ask Garud” widget) across routes, but the product still feels like **two products stitched together**: legacy **marketing snapshot** pages (e.g. `/`) vs **React platform** pages (`/marketplace`, `/enquiry`, rebuilt `/about-us`, `/services`, `/b2b-partners`). Recent polish (commits `52acd27`, `421940f`) improved header overflow, mobile menu `inert`/ARIA, login role hints, and marketplace filter layout on small screens — yet **visual rhythm, CTA naming, auth discoverability, and loading states** still undermine a “finished” UI/UX.

**Scores (1 = poor, 10 = production-polished):**

| Area | Score | Notes |
|------|------:|-------|
| **Marketing** | **6/10** | Good copy and section structure; homepage hero/card layout differs from rebuilt pages; logo reads as “CG” not “GarudHub”; repeated partner CTAs. |
| **Marketplace** | **6/10** | Strong full-bleed hero and RFQ story; filters/tabs dense on mobile; stat strip text clips; plain “Loading marketplace…” fallback. |
| **Auth** | **7/10** | Role-specific login copy + status hint (partner) is clear; session gate (“One moment”) flashes on every visit; generic `/auth/login` vs role URLs still confusing site-wide. |
| **Forms** | **7/10** | `/enquiry` labels and fields are consistent with platform tokens; error/success states not exercised in this pass. |
| **Mobile nav** | **5/10** | Menu opens and is deep; `aria-expanded` not synced on toggle; auth CTAs missing from mobile header on several routes; very long submenu lists. |
| **Desktop header** | **7/10** | Mega-nav + topbar on wide viewports; Register/Login visible on home; inconsistent on some platform routes at mobile widths. |

**Overall:** MVP-demo **~6/10** — credible for pilots, not yet cohesive consumer-grade UX.

---

## Recent commits vs remaining gaps

### `52acd27` — *fix: UX polish for header, mobile nav, login, and marketplace*

**Improved:**

- Header overflow and tap targets; topbar behavior on mobile (`platform.css`, `header-mobile.css`, `marketing-landing-hero.css`).
- Mobile menu accessibility: `inert`, `aria-hidden` sync on route/auth changes (`MarketingHeader.tsx`, `header-mobile.js`).
- Login: role intent copy and “wrong portal?” links (`LoginPageContent.tsx`).
- Marketplace: section tabs/filters wrapping on small screens (`platform.css`).

**Still open after this commit:**

- **Dual surface styling** (snapshot home vs React heroes) unchanged.
- **Login label proliferation** (“Login”, “Partner Portal Login”, “Buyer sign in”, “Sign in”) unchanged.
- **Mobile menu button state** (`aria-expanded` stays `false` when menu has class `active` — verified via JS toggle).
- **Platform route mobile header** often shows Contact/Call/Email only — no Register/Login in chrome (discoverability).

### `421940f` — *MarketingHeader inert prop for TypeScript CI*

**Improved:** Correct React `inert` boolean for CI/types.  
**UX impact:** None visible; prerequisite for a11y work in `52acd27`.

---

## Header & footer consistency

| Element | Consistent? | Observation |
|---------|-------------|-------------|
| Logo + skip link | Mostly | Present on all tested routes. |
| Topbar (email/phone) | Partial | Visible on desktop for `/b2b-partners`, `/services`; collapsed/hidden on mobile for many routes. |
| Primary nav labels | Yes | Home, About, Drone Services, Marketplace, B2B Partners, Join GarudHub. |
| Auth CTAs in header | **No** | `/` shows Register + Login; `/about-us`, `/marketplace`, `/buyer/rfqs` mobile snapshots omit header Register/Login (still in footer/mobile drawer). |
| Footer columns | Yes | 8 services, partner network, procurement links, legal, contact with emoji prefixes. |
| “Ask Garud” FAB | Yes | Present site-wide; competes visually with primary CTAs on mobile. |

---

## Findings table

| Sev | Page | Issue | Recommendation | Effort |
|-----|------|-------|----------------|--------|
| **P0** | `/buyer/rfqs` | Unauthenticated visit shows indefinite **“Loading…”** until auth resolves; sign-in card may appear late with no redirect to `/auth/login/buyer`. | Eager redirect or skeleton + explicit “Sign in as buyer” with role URL; timeout if `/platform-api` auth slow. | M |
| **P0** | Marketing (multiple) | **Trust copy** (escrow, “500+ verified sellers”, milestone payments) on `/b2b-partners`, `/about-us`, marketplace hero **ahead of product maturity** (payments stubbed per prior audits). | Add “Beta”/“Pilot” badges or soften claims; link to what is live today. | M |
| **P1** | All (mobile) | **Login CTA taxonomy**: “Login”, “Partner Portal Login”, “Buyer sign in”, “Sign in”, `/auth/login` vs `/auth/login/partner` — users cannot tell which to use. | Single header pattern: “Sign in” → chooser; keep role URLs for deep links only. | M |
| **P1** | `/` vs `/about-us`, `/services` | **Snapshot vs React visual language**: homepage boxed hero card; rebuilt pages use full-bleed `MarketingLandingHero` / snapshot HTML mix — typography and spacing shift on navigation. | Finish `UI_DESIGN_CONSISTENCY_PLAN`: one hero system per track or migrate `/` to React. | L |
| **P1** | `/marketplace` (390px) | **Stat strip** labels clip (“Compare Specs side b…”) — horizontal pressure in trust row. | Stack stats vertically on `<480px` or horizontal scroll with snap + fade hint. | S |
| **P1** | `/marketplace` | **Filter stack** (category pills + location + pricing + sort + search) overwhelms mobile; “Browse by category” competes with pill row. | Progressive disclosure: collapsible “Filters” sheet on mobile; sticky single-row category chips. | M |
| **P1** | Mobile nav | **`aria-expanded` not updated** when menu opens (`active` class set, `aria-expanded` remains `false`). | Sync in `header-mobile.js` `toggleMenu` / `openMenu` / `closeMenu`. | S |
| **P1** | `/`, `/about-us` | **Duplicate partner CTAs** in page body, footer, and mobile menu (“Register as B2B Partner” × many). | One primary partner CTA per viewport + secondary in footer only. | M |
| **P2** | Global | Logo asset reads as **“CG”** in mobile screenshots — weak brand recall vs “GarudHub”. | Wordmark or alt text visible in header; SVG with full name on sm+ breakpoints. | S |
| **P2** | Footer / search | **Emoji** in contact links (📞 ✉️) and search icon (🔍) — inconsistent with Phosphor/Bootstrap icons elsewhere. | Replace with icon font components; keep text labels. | S |
| **P2** | `/auth/login/*` | **Session gate** (“One moment / Checking your session…”) on every cold load before form — feels slow even when logged out. | Skip gate when no session cookie; show form immediately, check session in background. | M |
| **P2** | `/services` (768px) | **Eight horizontal tabs** (“All 8 Services”, marketplace, training, …) likely overflow or wrap awkwardly on tablet. | Scrollable tab list with fade edges or dropdown “Jump to service”. | M |
| **P2** | `/enquiry` | Intro has **two similar paragraphs** (requirement vs platform enquiry) — slight redundancy. | Merge into one lead + bullet list of what happens next. | S |
| **P2** | Hindi/English | Site is **English-only**; no i18n — fine for now, but Indian B2B buyers may expect Hindi toggles or Hinglish microcopy in forms. | Plan i18n or optional Hindi for RFQ/enquiry fields later. | L |
| **P2** | `/marketplace` | Suspense fallback is plain text **“Loading marketplace…”** without layout skeleton — layout shift when client hydrates. | Reuse listing skeleton grid from `MarketplaceClient` in `Suspense` fallback. | S |

---

## Viewport notes (spot checks)

| Viewport | Horizontal scroll (`/`) | Notes |
|----------|-------------------------|--------|
| 390×844 | No (`scrollWidth === clientWidth`) | Hero card margins wide; marketplace stat strip clips. |
| 768×1024 | Not fully re-tested on all pages | Services tab row high risk; marketplace filters need manual scroll check. |
| 1280×800 | No on `/b2b-partners` | Desktop mega-nav exposed; mobile drawer nodes still in DOM (expected) but hidden via CSS/`inert`. |

---

## Quick wins (days)

**Status:** Implemented on `dev` @ **`eaabd22`** (2026-11-05) unless noted.

1. Fix mobile menu **`aria-expanded`** + focus trap audit (build on `52acd27`). — **Done**
2. Marketplace **stat strip** mobile CSS; **Suspense skeleton** instead of text-only loading. — **Done**
3. **Unify login labels** in header/footer (2 strings max: “Register as partner”, “Sign in”). — **Done**
4. Replace **emoji** icons in footer/search with existing icon set. — **Done**
5. **`/buyer/rfqs`**: immediate signed-out empty state with CTA to `/auth/login/buyer`. — **Done earlier** (`6c5da08` RequireAuth redirect)

---

## Structural debt (weeks+)

1. **Migrate homepage** (and remaining snapshots) to shared React layout tokens — one spacing/typography scale.
2. **Design system pass**: CTA hierarchy (primary orange vs ghost vs link), card radius, section padding — document in `platform.css` tokens only (reduce inline styles in `MarketingHeader`).
3. **Trust & compliance copy** review with product/legal aligned to shipped features (payments, escrow, seller counts).
4. **Mobile nav IA**: reduce depth (8 services × marketplace subtabs × partners) — consider task-based grouping (“Buy”, “Sell”, “Services”).
5. **i18n** strategy if Hindi market is in scope.

---

## Manual test checklist (for product owner)

Use real devices + logged-in buyer/partner accounts:

- [ ] **Mobile menu:** Open/close, submenu expand, back button, focus not leaking to page behind; screen reader reads expanded state.
- [ ] **Auth paths:** From footer “Buyer sign in” vs header “Login” — confirm landing intent and post-login redirect (buyer → RFQs/orders, partner → dashboard).
- [ ] **Partner login** with wrong role email — error message clarity.
- [ ] **Marketplace:** Search, each category pill, location/pricing/sort filters; empty search results; listing card tap targets.
- [ ] **RFQ flow:** `/buyer/rfqs/new` logged out → login → return; create RFQ form validation errors.
- [ ] **Enquiry form:** Submit success/error; required field hints on mobile keyboard types (email, tel).
- [ ] **Cross-page drift:** Home → Marketplace → About — note font, button style, hero height changes (screenshot 3 pages).
- [ ] **Tablet landscape:** `/services` tabs and `/marketplace` filters — any horizontal page scroll?
- [ ] **Ask Garud widget:** Overlaps primary CTAs or cookie banners on small screens?
- [ ] **Backend down:** `/buyer/rfqs` and login when API unavailable — user sees actionable error, not infinite loading.

---

## Testing method reference

1. Cursor IDE Browser MCP navigation + accessibility snapshots.  
2. CDP `Emulation.setDeviceMetricsOverride` for 390 / 768 / 1280 widths.  
3. DOM probes: horizontal overflow, menu `active` class, login link inventory.  
4. Code cross-check: `MarketingHeader`, `LoginPageContent`, `RequireAuth`, `MarketplaceClient`, commits `52acd27` / `421940f`.

---

## Related docs

- [`UI_UX_AND_SCALE_AUDIT_REPORT.md`](./UI_UX_AND_SCALE_AUDIT_REPORT.md) (October 2026 static audit)  
- [`UI_DESIGN_CONSISTENCY_PLAN.md`](./UI_DESIGN_CONSISTENCY_PLAN.md)  
- [`ROUTE_MAP.md`](./ROUTE_MAP.md)

---

*Report-only pass — no code changes applied in this task.*
