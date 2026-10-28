# UI Design Consistency Plan — GarudHub Platform

**Status:** Phase A–C implemented on all `(platform)` routes (2026-10-23). Snapshot HTML (47 pages) still out of scope.   Phase C implemented (2026-10-23).  
**Audience:** Client presentation prep + engineering rollout.  
**Scope:** Next.js `(platform)` routes under `frontend/app/(platform)/**/page.tsx`.  
**Out of pass 1:** Full re-skin of **47** static marketing snapshot HTML pages in `frontend/content/raw/` (served alongside the app; verified by `frontend/scripts/verify-snapshots.mjs`).

---

## 1. Page inventory

### Summary

| Metric | Count |
|--------|------:|
| **Total platform `page.tsx` routes** | **33** |
| Routes with inline `style={{}}` (AI/dev patch signal) | 23 |
| Routes using `PlatformPageHeader` | 22 |
| Routes using `PartnerPageShell` | 11 |
| Snapshot marketing HTML (separate track) | 47 |

### Grouped by area

| Area | Persona / purpose | Routes | Count |
|------|-------------------|--------|------:|
| **Auth** | Login, register | `/auth/login`, `/auth/register` | 2 |
| **Marketing (React)** | Clone-adjacent pages in platform tree | `/about-us`, `/services`, `/b2b-partners` | 3 |
| **Marketplace (public)** | Browse, listing detail, partner storefront | `/marketplace`, `/marketplace/listings/[id]`, `/marketplace/partners/[orgId]` | 3 |
| **Buyer** | RFQ, cart, checkout, orders | `/buyer/rfqs`, `/buyer/rfqs/new`, `/buyer/rfqs/[id]`, `/buyer/cart`, `/buyer/checkout`, `/buyer/orders`, `/buyer/orders/[id]` | 7 |
| **Partner** | Hub, onboarding, catalog, RFQs, orders, docs | `/partner`, `/partner/application`, `/partner/catalog`, `/partner/catalog/new`, `/partner/catalog/[id]`, `/partner/documents`, `/partner/rfqs`, `/partner/rfqs/[id]`, `/partner/orders`, `/partner/orders/[id]` | 11 |
| **Admin** | Applications, listings, orders (+ legacy redirects) | `/admin`, `/admin/applications/[id]`, `/admin/listings`, `/admin/listings/[id]`, `/admin/orders`, `/admin/orders/[id]`, `/admin/orders/[id]/cancel` → redirect, `/admin/orders/[id]/payment` → redirect | 7 |

### Full route table

| Route | Persona | `PlatformPageHeader` | `PartnerPageShell` | Inline styles (approx.) |
|-------|---------|:--------------------:|:------------------:|------------------------:|
| `/auth/login` | Public | — | — | 0 |
| `/auth/register` | Public | — | — | 0 |
| `/about-us` | Public | — | — | 71 |
| `/services` | Public | — | — | 50 |
| `/b2b-partners` | Public | — | — | 58 |
| `/marketplace` | Public | — (hero in client) | — | 0 |
| `/marketplace/listings/[id]` | Public | Yes | — | 20 |
| `/marketplace/partners/[orgId]` | Public | Yes | — | 3 |
| `/buyer/rfqs` | Buyer | Yes | — | 0 |
| `/buyer/rfqs/new` | Buyer | Yes | — | 14 |
| `/buyer/rfqs/[id]` | Buyer | Yes | — | **102** |
| `/buyer/cart` | Buyer | Yes | — | 6 |
| `/buyer/checkout` | Buyer | Yes | — | 47 |
| `/buyer/orders` | Buyer | Yes | — | 0 |
| `/buyer/orders/[id]` | Buyer | Yes | — | 42 |
| `/partner` | Partner | Yes | Yes | 4 |
| `/partner/application` | Partner | Yes | Yes | 0 |
| `/partner/catalog` | Partner | Yes | Yes | 12 |
| `/partner/catalog/new` | Partner | Yes | Yes | 29 |
| `/partner/catalog/[id]` | Partner | Yes | Yes | 23 |
| `/partner/documents` | Partner | Yes | Yes | 1 |
| `/partner/rfqs` | Partner | Yes | Yes | 1 |
| `/partner/rfqs/[id]` | Partner | Yes | Yes | 34 |
| `/partner/orders` | Partner | Yes | Yes | 0 |
| `/partner/orders/[id]` | Partner | Yes | Yes | 16 |
| `/admin` | Admin | Yes | — | 0 |
| `/admin/applications/[id]` | Admin | — | — | 2 |
| `/admin/listings` | Admin | Yes | — | 14 |
| `/admin/listings/[id]` | Admin | — | — | 46 |
| `/admin/orders` | Admin | Yes | — | 25 |
| `/admin/orders/[id]` | Admin | — | — | 61 |
| `/admin/orders/[id]/cancel` | Admin | redirect only | — | — |
| `/admin/orders/[id]/payment` | Admin | redirect only | — | — |

---

## 2. Current problems (with examples)

### 2.1 Strong tokens, weak adoption

`frontend/app/styles/platform.css` defines a coherent token layer (`--platform-accent`, `--platform-cta`, `--platform-gutter`, `.platform-title`, `.platform-card`, `.platform-table`, `.platform-form`, `.platform-page-header`, `.platform-detail-layout`, `.platform-stat-grid`, etc.) — **~2,800+ lines**, including marketplace and auth-specific blocks.

Despite that, many pages re-specify the same values inline:

- **Hardcoded slate/green palette** in TSX instead of CSS variables: e.g. `#0f172a`, `#64748b`, `#2f5233`, `#334155` appear across buyer checkout, RFQ detail, admin orders, and all three React marketing pages (grep hits in 15+ files under `(platform)`).
- **Buyer RFQ detail** (`buyer/rfqs/[id]/page.tsx`): ~102 inline `style={{}}` blocks building stat grids, comparison tables, and CTAs that duplicate classes already in `platform.css` (e.g. `.platform-stat-grid`, `.platform-stat-card` exist but are unused here).
- **Admin order detail** (`admin/orders/[id]/page.tsx`): custom `<h1>Order #…</h1>` without `platform-title` / `PlatformPageHeader`, while list pages use the shared header — admin **list vs detail** feel like different products.

### 2.2 Layout shell confusion

- **Active shell:** `(platform)/layout.tsx` wraps all platform routes in `MarketingShell` → `MarketingHeader` + `platform-content-inner` + `MarketingFooter` (`components/marketing/MarketingShell.tsx`).
- **Unused shell:** `PlatformShell` (`components/platform/PlatformShell.tsx`) — minimal dev-style header/footer — **is never imported** anywhere. Dead alternate UX path.
- **Partner-only shell:** `PartnerPageShell` adds subnav + rhythm for 11 routes; buyer and admin have **no equivalent** `BuyerPageShell` / `AdminPageShell` (admin uses `AdminSubnav` ad hoc on some pages only).

### 2.3 Header and page title drift

- **22/33** routes use `PlatformPageHeader` (consistent `platform-title` + subtitle + breadcrumbs/actions).
- **Missing header:** admin detail pages (`admin/orders/[id]`, `admin/listings/[id]`, `admin/applications/[id]`), React marketing pages (custom `<h1 style={{…}}>` heroes), and marketplace index (hero via `MarketingLandingHero` only — intentional but different pattern).
- **Duplicate heading systems:** inline `h2` at `1.15rem`, `1.35rem`, `1.4rem`, `1.6rem` with `fontWeight: 700|800` on the same flows (e.g. `partner/catalog/new/page.tsx` five identical inline section titles; `about-us/page.tsx` mixed 1.4 vs 1.6).

### 2.4 Forms: structured vs raw

**Good reference:** `auth/login/page.tsx` — `AuthPage`, `platform-form`, `platform-field`, `platform-auth-card`.

**Inconsistent:**

- `partner/application/page.tsx` — heavy use of `platform-form-section` / `platform-field` (31 field-section hits).
- `buyer/checkout/page.tsx` — mix of cards and inline layout; 47 inline styles for address panels and payment mode UI.
- `admin/applications/[id]/page.tsx` — plain `<label>` / inputs without `platform-form` wrapper; raw `<h3>Documents</h3>`.

### 2.5 Tables, cards, badges

- **Tables:** List pages (`buyer/orders`, `partner/orders`, `admin/page`) consistently use `platform-table` inside `platform-card` — good.
- **StatusBadge:** Used widely and maps to `.platform-status-badge--*` in CSS — good anchor component.
- **Cards:** Detail pages often use `platform-card` then override spacing/margins inline (`marginBottom: '1.5rem'`) instead of modifiers (e.g. `.platform-card--spaced`).

### 2.6 Persona visual drift (auth / partner / buyer / admin)

| Persona | Typical pattern | Drift |
|---------|-----------------|-------|
| Auth | Centered `AuthPage`, tokenized form | Aligned with system; low risk |
| Partner | `PartnerPageShell` + `PlatformPageHeader` + subnav | Best-aligned area; some detail pages still inline-heavy |
| Buyer | Header yes; RFQ/order/checkout custom layouts | Highest inline-style density |
| Admin | List pages polished; **detail pages bespoke dashboard** | Feels like a separate admin prototype |
| Public marketplace | Full-bleed marketplace CSS (`:has(.platform-marketplace-page)`) | Intentionally different; listing detail reverts to padded inner + inline styles |

### 2.7 “AI patch” pattern catalog

1. **Copy-paste stat grids** — `display: 'grid'`, `repeat(auto-fit, minmax(180px, 1fr))`, `#f8fafc` background (RFQ detail, marketing pages).
2. **Section headings** — repeated `h2 style={{ fontSize: '1.15rem', marginTop: 0, marginBottom: '1rem' }}` (catalog new/edit, admin detail).
3. **Link styling in subtitles** — `style={{ color: '#2f5233', fontWeight: 600, textDecoration: 'underline' }}` on RFQ links in order detail (buyer + partner) instead of `.platform-inline-link` or token.
4. **Button class + inline override** — `className="platform-btn platform-btn-cta"` plus `style={{ padding: '0.65rem 1.25rem' }}` (RFQ detail).
5. **Marketing React pages** — `/about-us`, `/services`, `/b2b-partners` built as one-off landing sections with 50–71 inline styles each, sharing little with `platform-display-title` / marketing snapshot CSS.
6. **Skeleton loaders** — one-off `platform-skeleton` with inline height/width instead of shared loading component (`PlatformLoading.tsx` underused on pages).

**Approximate inline-style volume:** **670+** `style={{` occurrences across **23** platform page files (grep on `frontend/app/(platform)`).

---

## 3. Design system target (practical, no Figma)

**Principle:** Extend **`platform.css` as single source of truth** and add a **small React component set** only where repetition hurts (not a full design library).

### 3.1 CSS extensions (prefer modifiers over new files)

Add or standardize usage of:

| Token / class | Purpose |
|---------------|---------|
| Existing `--platform-*` | No new palette; stop hardcoding hex in TSX |
| `.platform-section-heading` | All in-card `h2`/`h3` section titles (replace 1.15rem inline block) |
| `.platform-stat-grid`, `.platform-stat-card` | Already defined — **mandate** for RFQ/marketing stat rows |
| `.platform-inline-link` | Accent links in subtitles (RFQ ↔ order) |
| `.platform-card--lg`, `.platform-stack`, `.platform-stack--lg` | Spacing between cards (replace `marginBottom` inline) |
| `.platform-empty` | Align with existing `EmptyState` component styles |
| `.platform-admin-detail` | Optional wrapper for admin detail two-column layout |

### 3.2 Minimal component set (thin wrappers)

| Component | Responsibility | Replaces |
|-----------|----------------|----------|
| **`Button`** | `variant: primary \| secondary \| cta \| danger \| link`, `asChild` for Next `Link` | Scattered `platform-btn*` + inline padding |
| **`Card`** | `platform-card` + optional `flat`, `padding` | Raw divs + margin inline |
| **`FormField`** | `label`, `htmlFor`, `hint`, `error`, children | Duplicate `platform-field` markup |
| **`PageLayout`** | Optional `subnav` slot; wraps `platform-content-inner` spacing rules | Ad hoc buyer/admin wrappers |
| **`DataTable`** | `platform-table-wrap` + empty row + loading skeleton | Copy-pasted table boilerplate |
| **`PageHeader`** | Re-export / thin wrapper around existing **`PlatformPageHeader`** | Raw `<h1>` on admin/marketing |

**Do not adopt** `PlatformShell` for production without product decision — either delete in a later cleanup pass or document as “internal dev only.”

### 3.3 Shared behavior

- **`StatusBadge`**, **`EmptyState`**, **`SectionTabs`**, **`ListingCard`**, **`AuthPage`** — keep; document as canonical in a short `frontend/docs/PLATFORM_UI.md` (optional, post-approval).
- Loading: prefer **`PlatformLoading`** or skeleton classes over inline dimensions.

---

## 4. Consistency rules

### Typography

| Level | Class / element | Size | Use |
|-------|-----------------|------|-----|
| Page title | `.platform-title` via `PlatformPageHeader` | 1.75rem | Every authenticated list/detail except full-bleed marketplace hero |
| Page subtitle | `.platform-subtitle` | inherited muted | One line under title; no inline gray |
| Section title (in card) | `.platform-section-heading` (new) | 1.125rem, semibold | “Line items”, “Purchased Line Items”, form steps |
| Card meta label | `.platform-stat-card span` or `.platform-form-section-desc` | 0.75–0.8125rem | Spec grids |
| Body | inherit from `.platform-marketing-root` | 1rem base | No arbitrary `lineHeight` inline |

**Fonts:** Keep `Inter` body + `Sora` for `.platform-display-title` on marketing heroes only.

### Spacing

- Page padding: **`platform-content-inner`** only (42px gutter desktop); no extra horizontal padding in pages.
- Vertical rhythm: **1.25rem** between major blocks (`platform-page-header` → first card); use stack utilities, not `marginBottom: '1.5rem'` one-offs.
- Form fields: **`platform-field`** margin-bottom 0.75rem; multi-column via **`platform-field-row`**.

### Colors

- Text: `var(--platform-text)` / `var(--platform-muted)`.
- Primary actions: **`platform-btn`** (accent green).
- Conversion CTAs: **`platform-btn-cta`** (orange) — max one primary CTA per viewport section.
- Secondary: **`platform-btn-secondary`**.
- Destructive: **`platform-btn-danger`**.
- **Ban** new hex in TSX except images/charts; eslint rule optional in Phase B.

### Buttons

- One primary button per card footer; secondary actions as `platform-btn-secondary` or `platform-link-btn`.
- Links styled as buttons: use `Button asChild` + `Link`, not `platform-btn` + inline `textDecoration: 'none'`.

### Forms

- Always wrap in **`platform-form`** (or `platform-form platform-auth-card` for narrow auth).
- Sections: **`platform-form-section`** + **`platform-form-section-title`**.
- Filters: reuse **`platform-filter-bar`** pattern from `admin/page.tsx`.

### Tables

- **`platform-card` > `platform-table-wrap` > `platform-table`**.
- Empty: **`EmptyState`** or `<p className="platform-muted">` inside card — same copy pattern (“No X yet” + action link).

### Empty & error states

- Errors: **`platform-card platform-error`**.
- Success: **`platform-card platform-success`**.
- Marketplace errors: keep **`platform-marketplace-error`** block (already consistent in `MarketplaceClient.tsx`).

---

## 5. Phased rollout (client presentation)

### Phase A — Pre-demo (target **4–8 hours**)

**Goal:** First-click paths look like one product — marketplace entry, auth, partner story, buyer RFQ story, cart/checkout.

**Exact routes (10 UI surfaces + 1 component file):**

1. `/marketplace` — `MarketplaceClient.tsx` (tabs, empty/error, partner nudge)
2. `/marketplace/listings/[id]` — public listing detail template
3. `/auth/login`
4. `/auth/register`
5. `/b2b-partners` — partner-facing marketing story (likely shown in demo)
6. `/partner` — partner dashboard first impression
7. `/buyer/rfqs` — buyer home list
8. `/buyer/rfqs/[id]` — highest-visibility buyer detail (largest inline cleanup win)
9. `/buyer/cart`
10. `/buyer/checkout`

**Phase A tasks (ordered):**

1. Add CSS utilities (section heading, stat grid enforcement, inline link) — **~1h**
2. Refactor `/buyer/rfqs/[id]` to classes — **~2–3h**
3. Align listing detail + checkout + cart spacing/typography — **~2h**
4. Light pass on `/b2b-partners` hero + CTA buttons to match marketplace — **~1h**
5. Smoke visual pass on auth + partner dashboard — **~30m**

**Explicitly not Phase A:** admin, partner catalog editors, order detail innards, `/about-us`, `/services`, snapshot HTML.

### Phase B — One week (~**24–32 hours**)

- **Partner remainder:** `/partner/application`, `/partner/catalog`, `/partner/catalog/new`, `/partner/catalog/[id]`, `/partner/documents`, `/partner/rfqs`, `/partner/rfqs/[id]`, `/partner/orders`, `/partner/orders/[id]`
- **Buyer remainder:** `/buyer/rfqs/new`, `/buyer/orders`, `/buyer/orders/[id]`
- **Marketplace:** `/marketplace/partners/[orgId]`
- Introduce thin **`Button`**, **`FormField`**, **`DataTable`** components and migrate partner forms + buyer order detail

### Phase C — Admin + marketing React (~**16–24 hours**)

- **Admin:** `/admin`, `/admin/applications/[id]`, `/admin/listings`, `/admin/listings/[id]`, `/admin/orders`, `/admin/orders/[id]`
- Standardize admin detail on `PlatformPageHeader` + `AdminSubnav` + shared detail layout
- **Marketing React:** `/about-us`, `/services` — extract shared “marketing section” classes or reuse snapshot section CSS variables

### Out of scope (all phases)

- Re-skinning all **47** snapshot HTML pages in `content/raw/`
- Replacing `MarketingHeader`/`Footer` with cloned snapshot markup
- Removing `PlatformShell` (unless product chooses unified nav — separate decision)

---

## 6. Page-by-page checklist

Legend: **Issue** → **Action**

### Auth

| Route | Current issues | Action |
|-------|----------------|--------|
| `/auth/login` | Reference-quality; uses `AuthPage` | Phase A: verify focus states only |
| `/auth/register` | Long form; uses sections | Phase A: verify section titles use shared class |

### Marketing (React)

| Route | Current issues | Action |
|-------|----------------|--------|
| `/about-us` | 71 inline styles; custom hero | Phase C: section components + `platform-display-title` |
| `/services` | 50 inline styles | Phase C: same as about-us |
| `/b2b-partners` | 58 inline styles; demo-critical | Phase A: hero, stats, CTA buttons → tokens |

### Marketplace

| Route | Current issues | Action |
|-------|----------------|--------|
| `/marketplace` | No page header (hero only); special full-bleed CSS | Phase A: confirm hero + grid match listing detail tone |
| `/marketplace/listings/[id]` | 20 inline styles; mixed with header | Phase A: card layout + CTA row standardization |
| `/marketplace/partners/[orgId]` | 3 inline styles | Phase B: minor class pass |

### Buyer

| Route | Current issues | Action |
|-------|----------------|--------|
| `/buyer/rfqs` | Clean list | Phase A: empty state copy + link style |
| `/buyer/rfqs/new` | 14 inline styles | Phase B: form sections → `FormField` |
| `/buyer/rfqs/[id]` | 102 inline styles; stat grids | Phase A: migrate to `.platform-stat-grid`, section headings |
| `/buyer/cart` | 6 inline styles | Phase A: line item table + checkout CTA |
| `/buyer/checkout` | 47 inline styles | Phase A: address blocks → form layout classes |
| `/buyer/orders` | Clean table | Phase B: optional buyer subnav |
| `/buyer/orders/[id]` | 42 inline styles; inline RFQ links | Phase B: detail layout + `platform-inline-link` |

### Partner

| Route | Current issues | Action |
|-------|----------------|--------|
| `/partner` | 4 inline styles | Phase A: dashboard stat cards |
| `/partner/application` | Good form structure | Phase B: polish only |
| `/partner/catalog` | 12 inline styles | Phase B: table + filters |
| `/partner/catalog/new` | 29 inline; repeated h2 inline | Phase B: `platform-section-heading` |
| `/partner/catalog/[id]` | 23 inline styles | Phase B: same as new |
| `/partner/documents` | Mostly clean | Phase B: upload zone spacing |
| `/partner/rfqs` | 1 inline | Phase B: trivial |
| `/partner/rfqs/[id]` | 34 inline styles | Phase B: quotation UI panels |
| `/partner/orders` | Clean table | Phase B: — |
| `/partner/orders/[id]` | 16 inline; fulfillment panels | Phase B: align with buyer order detail |

### Admin

| Route | Current issues | Action |
|-------|----------------|--------|
| `/admin` | Clean | Phase C: — |
| `/admin/applications/[id]` | No `PlatformPageHeader`; raw lists | Phase C: header + form for reject |
| `/admin/listings` | 14 inline (filters/table UI) | Phase C: DataTable |
| `/admin/listings/[id]` | 46 inline; raw h1 | Phase C: header + section headings |
| `/admin/orders` | 25 inline | Phase C: filter bar standardization |
| `/admin/orders/[id]` | 61 inline; raw h1; dashboard feel | Phase C: full detail template |
| `/admin/orders/[id]/cancel` | Redirect | No UI work |
| `/admin/orders/[id]/payment` | Redirect | No UI work |

---

## 7. Success criteria (“done” looks like)

1. **Zero inline `style={{}}`** on Phase A routes except truly dynamic values (e.g. progress bar width) — enforced by grep in CI or PR checklist.
2. **Every list and detail page** in buyer/partner/admin uses **`PlatformPageHeader`** (marketplace index excepted).
3. **One button language:** primary / secondary / CTA / danger only via shared classes or `Button` component — no ad hoc padding on CTAs.
4. **Typography:** no page-level `h1`/`h2` font-size inline; section titles use **`.platform-section-heading`**.
5. **Colors:** no `#0f172a` / `#2f5233` in `(platform)` TSX — tokens only.
6. **Forms:** all multi-field pages use **`platform-form`** + **`platform-field`** (or `FormField`).
7. **Demo walkthrough** (marketplace → register → partner hub **or** RFQ → cart → checkout) feels like the same brand as `MarketingHeader`, without “internal admin prototype” pockets on public-critical paths.
8. **Partner area** remains the quality bar; buyer RFQ detail and admin detail **match** partner order detail density and spacing.

---

## 8. Effort estimate (hours)

| Phase | Scope | Engineering | Design review / QA |
|-------|--------|------------:|-------------------:|
| **A** | 10 routes + CSS utilities + `MarketplaceClient` | **6–8** | **1–2** |
| **B** | Partner + buyer remainder + 3 components | **24–32** | **4–6** |
| **C** | Admin + `/about-us` + `/services` | **16–24** | **3–4** |
| **Snapshots (future)** | 47 HTML pages | **40–80+** (separate project) | — |

**Total platform React consistency (A+B+C):** ~**46–64** engineering hours + **8–12** QA.

---

## Appendix: Key file references

| Concern | Path |
|---------|------|
| Design tokens & utilities | `frontend/app/styles/platform.css` |
| Global platform layout | `frontend/app/(platform)/layout.tsx` |
| Marketing chrome | `frontend/components/marketing/MarketingShell.tsx` |
| Unused alt shell | `frontend/components/platform/PlatformShell.tsx` |
| Page title pattern | `frontend/components/platform/PlatformPageHeader.tsx` |
| Partner layout | `frontend/components/platform/PartnerPageShell.tsx` |
| Status chips | `frontend/components/platform/StatusBadge.tsx` |
| Auth pattern | `frontend/components/platform/AuthCard.tsx`, `auth/login/page.tsx` |
| Marketplace browse | `frontend/app/(platform)/marketplace/MarketplaceClient.tsx` |
| Snapshot scope | `frontend/content/raw/*.html` (47 files) |

---

*Prepared for approval before any implementation commit.*
