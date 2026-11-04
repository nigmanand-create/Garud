# GarudHub — Final PRD Audit (Detailed)

**Document type:** Stakeholder-ready gap audit vs product wireframe  
**Audit date:** 4 November 2026  
**Code baseline:** Git branch `dev`, commit **`e1c75af`** (`feat: POR RFQ accept and per-vertical service routes`)  
**Primary spec:** [`DECODE_JWT_SPEC.txt`](./DECODE_JWT_SPEC.txt) (GarudHub website UI wireframe / blueprint)  
**Cross-references:** [`PRD_REMAINING_TASKS.md`](./PRD_REMAINING_TASKS.md), [`ROUTE_MAP.md`](./ROUTE_MAP.md), [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md), [`PAYMENTS_RUNBOOK.md`](./PAYMENTS_RUNBOOK.md), [`SPEC_VS_PROJECT_GAP_ANALYSIS.md`](./SPEC_VS_PROJECT_GAP_ANALYSIS.md)

---

## Table of contents

1. [Executive summary](#executive-summary)
2. [Methodology and scoring model](#methodology-and-scoring-model)
3. [Section A — PRD section-by-section matrix](#section-a--prd-section-by-section-matrix)
4. [Section B — UI/UX deep dive](#section-b--uiux-deep-dive)
5. [Section C — User journey walkthroughs](#section-c--user-journey-walkthroughs)
6. [Section D — Production readiness (P0/P1) with evidence](#section-d--production-readiness-p0p1-with-evidence)
7. [Section E — Risk register](#section-e--risk-register)
8. [Section F — Recommended 30 / 60 / 90 day roadmap](#section-f--recommended-30--60--90-day-roadmap)
9. [Appendix](#appendix)

---

## Executive summary

GarudHub’s wireframe PRD positions the product as **India’s B2B Drone Ecosystem Platform** — a business-generation surface where manufacturers, international entrants, distributors, service providers, training institutes, buyers, and government actors connect, list, submit RFQs, receive leads, and grow partnerships. Against that full vision, the **`dev` @ `e1c75af`** codebase represents a **mature transactional and operations platform** layered on a **partially migrated marketing stack**.

| Dimension | Estimated completion | Interpretation |
|-----------|---------------------|----------------|
| **Full ecosystem PRD** (8 service verticals + partner dashboard + marketplace + journeys) | **~78–82%** | Phases 1–8 in [`PRD_REMAINING_TASKS.md`](./PRD_REMAINING_TASKS.md) are largely implemented in code; remaining gaps are polish, depth, and legacy HTML surfaces |
| **UI fidelity vs wireframe** (layout blocks, visual design, chrome unity) | **~68–72%** | Functional block parity on React home and platform routes; cinematic photography, ecosystem graphics, and ~38 snapshot pages lag the spec’s premium aviation aesthetic |
| **UX / end-to-end journeys** (persona flows without dead ends) | **~72–76%** | Commerce, RFQ, lead loop, service matching, training, and gov interest paths are testable; tender bid vault, DGCA checklist depth, and snapshot auth state remain weak |
| **Production go-live readiness** (ops + secrets + payments proof) | **~35–40%** | Application **code guards** are strong; **Phase 0 hosting/ops checklist** in [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) remains almost entirely operator-owned and unchecked |
| **Narrow MVP slice** (marketplace + KYC + RFQ + cart/checkout + admin trust) | **~88–92%** | Suitable for controlled launch **after** Phase 0 ops, staging smoke, and `dev` → `main` merge |

**Leadership one-liner:** The product is **build-ready for demo and controlled launch** on staging (`dev.garudhub.me`); **public production traffic on garudhub.me is blocked by infrastructure and operational proof**, not by missing core marketplace/RFQ/partner modules. Brand unity and wireframe-grade visual design will improve as remaining marketing snapshots migrate and a design pass lands on heroes and dark CTA bands.

**What changed since early gap docs:** [`SPEC_VS_PROJECT_GAP_ANALYSIS.md`](./SPEC_VS_PROJECT_GAP_ANALYSIS.md) (October 2026) described ~50% completion with missing Leads, Messages, and training models. At `e1c75af`, those modules exist with routes, APIs, and Prisma migrations through Phase 8. Treat older percentage tables as **historical**; this audit supersedes them for planning.

---

## Methodology and scoring model

This audit used a **traceability-first** method:

1. **Spec decomposition** — Every major bullet in [`DECODE_JWT_SPEC.txt`](./DECODE_JWT_SPEC.txt) was mapped to an expected user-visible outcome (page block, nav item, dashboard module, or journey step).
2. **Route verification** — React routes under `frontend/app/(platform)/**/page.tsx` (**67** `page.tsx` files at baseline), legacy snapshot manifest (`frontend/content/raw/**`, **47** HTML files), and redirect bridge (`frontend/lib/snapshot-bridge.ts`, `frontend/middleware.ts`) were checked against [`ROUTE_MAP.md`](./ROUTE_MAP.md).
3. **Task ledger** — Open vs closed work was taken from [`PRD_REMAINING_TASKS.md`](./PRD_REMAINING_TASKS.md) (Phases 0–8); Phase 0 ops items remain unchecked by design (not provable from repo alone).
4. **Status labels**
   - **Done** — Spec intent met for MVP; known partials documented inline.
   - **Partial** — User-visible path exists but wireframe detail, automation, or edge cases remain.
   - **Missing** — No first-party implementation or explicitly deferred (e.g. COD).
5. **Evidence types** — Route paths, representative API prefixes (`/platform-api/v1/*` proxy), Prisma enums (e.g. `AccountType` in `backend/prisma/schema.prisma`), and doc cross-links.

Scores are **weighted narratives**, not automated test coverage. They intentionally separate **product completeness** from **production readiness**.

---

## Section A — PRD section-by-section matrix

### A.1 Vision, positioning, and objective (Spec §1, §7, §8)

| Spec requirement | Status | Evidence | Notes |
|------------------|--------|----------|-------|
| Position as India’s B2B Drone Ecosystem Platform | **Done** | React `/` hero copy in `frontend/lib/platform/home-content.ts`; `/about-us`, `/b2b-partners` | Tagline “Connect. Partner. Sell. Service. Grow.” appears in spec; site uses adjacent messaging |
| Business-generation platform (not info site) | **Partial** | Marketplace, RFQ, leads, enquiries, service requests, partnerships, payments | Blog/legal remain informational snapshots |
| Connect global drone industry with India | **Done** | `/b2b-partners`, international registration hints (`InternationalPartnerHints` per PRD Phase 3) | No automated “market entry” workflow beyond enquiry |

### A.2 Site structure and main navigation (Spec §2, §3 main nav)

| Spec nav item | Status | Route(s) | Notes |
|---------------|--------|----------|-------|
| HOME | **Done** | `/` React (`app/(platform)/page.tsx`) | Snapshot home removed per Phase 3 |
| ABOUT US | **Done** | `/about-us` | |
| DRONE SERVICES | **Done** | `/services` + anchors; `/services/[vertical]` | Per-vertical deep links to intake or hubs |
| MARKETPLACE | **Done** | `/marketplace`, vendors, PDP, compare, distributor | Featured products module **Partial** (newest-first, no ranking signal) |
| B2B PARTNERS | **Done** | `/b2b-partners` | Anchor sections for partner types |
| JOIN GARUDHUB | **Done** | `/auth/register`, `/auth/login`, `/partner/application` | Split registration vs wireframe single-page form — acceptable UX deviation |
| Header: LOGIN \| REGISTER AS B2B PARTNER | **Partial** | `frontend/lib/platform/header-nav.ts` | **Done** on all React routes; **Partial** on snapshots (injected CTAs, no logged-in state) |
| PARTNER DASHBOARD (post-login) | **Done** | `/partner/*` + `PartnerSubnav` | Spec sidebar modules implemented (see A.7) |

### A.3 PAGE 1 — Home (Spec wireframe blocks)

| Home block | Status | Evidence | Gap |
|------------|--------|----------|-----|
| Hero: India’s B2B Drone Ecosystem | **Done** | `HOME_CONTENT.hero` | **Partial** visual: green gradient hero, no cinematic drone photography |
| Who We Are | **Done** | `HOME_CONTENT.whoWeAre` | No ecosystem **graphic** (spec diagram) |
| Our Ecosystem flow diagram | **Partial** | Text flow Manufacturer → GarudHub → … | Not a designed diagram asset |
| Our Services (8 tiles) | **Done** | Eight tiles with links to marketplace/services verticals | Matches spec categories |
| Who Can Join GarudHub | **Done** | Eight partner types + register deep links | Spec also lists Buyer/Government on join page — via account types in register |
| Why GarudHub | **Done** | Four value props | |
| How It Works | **Done** | Five-step strip | |
| Industries Served | **Done** | Nine industries listed | |
| Primary CTA: Register as B2B Partner | **Done** | Hero + footer patterns on React pages | |

### A.4 PAGE 2 — About Us

| Element | Status | Route | Notes |
|---------|--------|-------|-------|
| Story, vision, mission, ecosystem, sectors | **Done** | `/about-us` | ~85% wireframe parity per gap history; polish optional |

### A.5 PAGE 3 — Drone Services hub (8 verticals)

| Vertical | Status | Primary routes | Backend / UX |
|----------|--------|----------------|--------------|
| 01 Marketplace pillar | **Done** | `/marketplace`, `/services#marketplace` | Catalog-driven |
| 02 Training | **Partial** | `/services/training`, `/training`, `/training/[id]` | Courses/batches/leads **Done** for institutes; spec sub-themes as marketing copy |
| 03 DGCA & Compliance | **Partial** | `/services/compliance`, `/services/request?category=COMPLIANCE` | Service-request matching **Done**; no DGCA portal integration or document checklist |
| 04 Repair & Maintenance | **Partial** | `/services/repair`, `REPAIR_AMC` intake | Matching + tracking **Done**; pickup scheduling **Missing** |
| 05 Professional Services | **Partial** | `/services/professional` | Intake + matching |
| 06 Finance & Insurance | **Partial** | `/services/finance` | Lead capture **Done**; EMI calculator / lender APIs **Missing** |
| 07 Government Projects | **Partial** | `/services/government`, `/government`, `/government/[id]` | Admin-curated opportunities **Done**; bid submission vault **Missing** |
| 08 Scrap & Recycling | **Partial** | `/services/recycling` | Intake + matching; valuation engine **Missing** |
| Select a service + Request service | **Done** | `/services/request`, `/services/track/[token]` | Phase 8 |
| Flow: Submit → Match → Connect → Service | **Done** | `ServiceRequest` lifecycle + partner inbox | Spec-compliant at MVP depth |

### A.6 PAGE 4 — B2B Partner Network

| Element | Status | Evidence |
|---------|--------|----------|
| Who can partner (types) | **Done** | `/b2b-partners` sections |
| Partnership models (product, tech, distribution, …) | **Done** | Copy + `/partner/partnerships` workflow |
| Why partner / Register CTA | **Done** | Links to `/auth/register?type=partner` |
| Dynamic partner directory | **Partial** | `/marketplace/vendors` + org storefronts; not a spec-style “network map” |

### A.7 PAGE 5 — Marketplace + RFQ

| Element | Status | Route / API | Notes |
|---------|--------|-------------|-------|
| Search products/services | **Done** | `/marketplace?q=` | Server-side search shipped Phase 4 |
| Category chips (drones, components, payloads, accessories, services) | **Partial** | Section tabs | Components + payloads merged in one tab |
| Featured products row | **Partial** | Sort newest | No featuring/ranking field |
| Vendor directory | **Done** | `/marketplace/vendors` | Filters: state, partner type, category |
| PDP: specs, MOQ, price/POR, warranty | **Done** | `/marketplace/listings/[id]` | |
| Request quote | **Done** | RFQ + enquiry CTAs | |
| Contact supplier / Send enquiry | **Done** | `/enquiry?listing=` | Routed to partner + Lead |
| Request demo | **Done** | PDP “Request demo” | |
| Become distributor | **Done** | `/marketplace/distributor` | |
| Product compare (non-RFQ) | **Done** | `/marketplace/compare?ids=` | Free-text specs — unstructured compare |
| B2B RFQ block + How RFQ works | **Done** | `/marketplace`, `/buyer/rfqs/new` | |
| Business opportunities block | **Done** | `BusinessOpportunitiesBlock` | Projects → enquiry, not project board |
| RFQ: requirement → vendors → quotes → compare → deal | **Done** | Buyer + partner RFQ modules | POR accept with `agreedPriceInr` at `e1c75af` |
| COD payment | **Missing** | Deferred in PRD Phase 4 | Enum unused |

### A.8 PAGE 6 — Join GarudHub + Partner Dashboard

| Element | Status | Evidence |
|---------|--------|----------|
| Account type picker (10 types) | **Done** | Prisma `AccountType` enum (MANUFACTURER, OEM, INTERNATIONAL_COMPANY, DISTRIBUTOR, DEALER, SERVICE_PROVIDER, TRAINING_INSTITUTE, TECHNOLOGY_COMPANY, BUYER_ENTERPRISE, GOVERNMENT_PSU) |
| Business registration fields (GST, CIN, docs) | **Partial** | `/auth/register` light + `/partner/application` + `/partner/documents` | Wireframe single-page → multi-step KYC |
| Verification: Submit → Verify → Approve → Dashboard | **Done** | Admin `/admin/applications`, gates on publish |
| Partner login | **Done** | `/auth/login`, temp password → `/auth/change-password` |

**Partner dashboard modules (spec sidebar):**

| Module | Status | Route |
|--------|--------|-------|
| Dashboard / Welcome | **Done** | `/partner` + `GET /partner/overview` |
| My Profile | **Done** | `/partner/application`, `/partner/documents` |
| Products | **Done** | `/partner/catalog/*` |
| Services | **Done** | `/partner/services` |
| Leads | **Done** | `/partner/leads` |
| RFQs | **Done** | `/partner/rfqs` |
| Enquiries | **Done** | `/partner/enquiries` |
| Orders | **Done** | `/partner/orders` |
| Partnerships | **Partial** | `/partner/partnerships` | Target org ID manual entry; no counterparty accept |
| Documents | **Done** | `/partner/documents` |
| Messages | **Partial** | `/partner/messages` | Polling MVP; no push/email on new message |
| Analytics | **Partial** | `/partner/analytics` | Views not deduped; no CSV export |
| Subscription / Payments | **Partial** | `/partner/subscription` | Razorpay subscriptions **built**; live go-live needs ops + runbook |
| Activity / audit (spec-adjacent) | **Done** | `/partner/activity` | |
| Service jobs (spec “service provider journey”) | **Done** | `/partner/service-requests` |
| Training institute hub | **Done** | `/partner/training` |

Spec wireframe also lists **Payments** as distinct — covered under subscription + buyer checkout.

### A.9 Persona journeys (Spec §4)

See **Section C** for step-by-step walkthroughs. Summary:

| Persona | Status |
|---------|--------|
| Buyer | **Done** (~85%) |
| Partner (generic) | **Done** (~82%) |
| International company | **Partial** (~75%) |
| Indian manufacturer | **Done** (~80%) |
| Service provider | **Done** (~78%) |
| Training institute | **Partial** (~72%) — dual lead records |
| Government / PSU buyer | **Partial** (~70%) — interest + RFQ, not full tender procurement |

### A.10 Design direction (Spec §5)

| Principle | Status | Notes |
|-----------|--------|-------|
| Premium aviation + B2B corporate | **Partial** | Coherent platform CSS; not full cinematic art direction |
| Large hero imagery | **Partial** | Gradients and icons predominate on React home |
| Dark technology CTA bands | **Partial** | Some sections; not global |
| Rounded service cards | **Done** | Platform card patterns |
| Strong Register CTA sitewide | **Partial** | React yes; snapshots partial auth |
| Subtle animations | **Missing** | No spec-level motion system |

### A.11 Admin and platform ops (spec-implied)

| Capability | Status | Route |
|------------|--------|-------|
| KYC queue | **Done** | `/admin/applications` |
| Listing moderation | **Done** | `/admin/listings` |
| Enquiry triage | **Done** | `/admin/enquiries` + CRM export |
| Partner leads oversight | **Done** | `/admin/leads` (read-only) |
| Service requests | **Done** | `/admin/service-requests` |
| Gov opportunities | **Done** | `/admin/gov-opportunities` |
| Partnership moderation | **Done** | `/admin/partnerships` |
| Orders / payments | **Done** | `/admin/orders` |
| Commerce analytics / GMV | **Done** | `/admin/analytics` |
| Partner billing plans | **Done** | `/admin/billing` |
| Users & roles | **Done** | `/admin/users` |
| Global audit log | **Done** | `/admin/audit-log` |
| Ops home dashboard | **Done** | `/admin` |

---

## Section B — UI/UX deep dive

### B.1 Chrome and navigation architecture

**Decision (Phase 3):** All React routes use **`MarketingShell`** — shared marketing header and footer. `PlatformShell` was deleted as dead code. Partner pages add **`PartnerPageShell`** + **`PartnerSubnav`** (16 items including Training and Service jobs). Admin uses **`AdminSubnav`** from `frontend/lib/platform/admin-ops.ts` (13 ops links).

**Spec alignment:** Top-level nav targets match [`ROUTE_MAP.md`](./ROUTE_MAP.md). Logged-in **buyer/government** header shows My RFQs, My Orders, Messages, Cart (with badge) via `header-nav.ts`. **Partner** header shows Partner dashboard, B2B RFPs, Orders, Messages. **Admin** shows Admin + Orders shortcut; full ops live in subnav.

**Friction points:**

1. **Two chrome generations** — React platform vs ~38 remaining snapshot pages (blog, legal, industry landings, market-entry copy). Snapshots receive injected LOGIN | REGISTER CTAs but cannot show cart, notification bell, or session-aware mega menu.
2. **Buyer dashboard entry on mobile** — Primary mobile CTA resolves to “Buyer” → `/buyer/rfqs`; orders and cart are in drawer on React only.
3. **Notification bell** — In-app notifications on desktop header (60s poll); **not** in mobile drawer per Phase 7 partial note.

### B.2 Home page block-by-block (React `/`)

| Wireframe block | Implemented | UX quality |
|-----------------|-------------|------------|
| Hero + dual CTA | Yes | Clear value prop; lacks full-bleed photography |
| Who we are | Yes | Text-only |
| Ecosystem diagram | Text flow only | Weaker than spec graphic |
| 8 service tiles | Yes | Good deep links including `/services/[vertical]` |
| Who can join | 8 types | Buyer/Gov not in tile grid (available at register) |
| Why / How / Industries | Yes | Scannable |
| Register CTA repeat | Yes | |

### B.3 Marketplace UX

- **Discoverability:** Filters for state, price type, sort; empty states with RFQ and enquiry CTAs; compare tray (max 4 SKUs, localStorage).
- **Vendor trust:** KYC-approved vendors; “Verified” badge uniform (all listed vendors approved).
- **RFQ prominence:** Dedicated block on marketplace listing pages and empty states — matches spec §1.4 RFQ sub-journey.
- **Gap vs spec:** No “featured” merchandising row; payload category folded into components tab.

### B.4 Partner dashboard UX

- **Information scent:** Overview widgets (open RFQs, orders, leads, enquiries, messages, catalog status, views, partnerships) reduce “empty dashboard” anxiety.
- **Subnav density:** 16 tabs may overwhelm on mobile — horizontal scroll tabs in `platform.css`.
- **Honesty:** “Soon” stubs removed; all spec modules route somewhere real or documented partial.

### B.5 Typography, color, and visual system

- **Stack:** Bootstrap Icons + platform/marketing CSS split; snapshot assets under `frontend/public/assets/**`.
- **Brand green:** `#1e3a29` register CTA on snapshot injection matches platform buttons.
- **Spec “dark technology sections”:** Partially present on marketing sections; not consistently applied on every major CTA band.
- **Consistency plan:** Any future `UI_DESIGN_CONSISTENCY_PLAN.md` execution would target hero photography, snapshot retirement, and tokenized colors — out of scope for this audit but listed in roadmap.

### B.6 Responsive and accessibility (quick pass)

- **Responsive:** Platform layouts use section tabs and grids; partner subnav scrolls horizontally.
- **Accessibility:** Semantic nav labels (`aria-label` on PartnerSubnav); forms on enquiry and service request use labels. Full WCAG audit **not** performed — recommend focused pass before gov/enterprise sales.
- **Snapshot pages:** Legacy HTML may have older markup; lower confidence for a11y on blog/legal.

### B.7 Snapshot inventory (by category, not file-by-file)

| Category | Count (approx.) | Treatment |
|----------|-----------------|-----------|
| Blog index + posts + categories | 24 HTML files | Snapshot serve; CTAs injected |
| Legal (TOS, privacy, refund) | 3 | Snapshot |
| Service/marketing landings (unbridged) | ~10 | e.g. `scrap-recycling`, `india-market-entry`, `government-projects-schemes` — still HTML |
| Bridged to React (redirect) | 9 paths | `SNAPSHOT_REACT_BRIDGE` + `/enquiry.php`, `/about.php` per ROUTE_MAP |
| Utility | `loan-calculators.php`, `enquiry.php` raw | Redirect or legacy |

**Total raw manifest:** 47 files in `frontend/content/raw/`.

---

## Section C — User journey walkthroughs

Each journey lists **spec steps → built behavior → gaps**.

### C.1 Buyer (enterprise)

| Step | Spec | Built @ e1c75af | Gap |
|------|------|-----------------|-----|
| 1. Discover products | Search marketplace | `/marketplace?q=` + filters | No personalized recommendations |
| 2. Compare | Compare vendors/products | Product compare URL; RFQ quote matrix on `/buyer/rfqs/[id]` | Product compare is spec-text based |
| 3. RFQ | Post requirement | `/buyer/rfqs/new` | |
| 4. Receive quotes | Verified vendors quote | Partner `/partner/rfqs/[id]` | |
| 5. Compare offers | Quotation comparison | Enhanced compare v2 (sort, best-column highlights) | No CSV / attachments matrix |
| 6. Transact | Contact or order | Accept priced quote → order; POR with agreed INR; or cart checkout | |
| 7. Message supplier | Connect | `/buyer/messages`, PDP “Message supplier” | No email notify on reply |

**Outcome:** **Journey complete** for standard B2B buy flows.

### C.2 Indian manufacturer (partner)

| Step | Spec | Built | Gap |
|------|------|-------|-----|
| Register | Account type + company | `/auth/register` → application | |
| Verify | Admin approve | `/admin/applications` | |
| Profile | Company profile | `/partner/application` | |
| List products | Catalog | `/partner/catalog` + moderation | Listing limit from subscription plan |
| Receive RFQ | Leads from buyers | `/partner/rfqs`, `/partner/leads` | |
| Enquiry | Buyer enquiry | `/partner/enquiries` | |
| Quote & order | Quotation → order | RFQ quote + order fulfillment | |
| Analytics | Performance block | `/partner/analytics` | View counts approximate |

**Outcome:** **Journey complete** aligned with wireframe dashboard intent.

### C.3 International company

| Step | Spec | Built | Gap |
|------|------|-------|-----|
| Market entry story | Partner with GarudHub | `/b2b-partners` + hints on register | |
| Register as international | Account type | `INTERNATIONAL_COMPANY` | |
| Verification & list | Same as partner | KYC + catalog | |
| Indian leads | Enquiries/RFQs | Routed leads | No geo-targeted lead marketplace |
| Distributor/dealer network | Distribution | Partnership requests + distributor enquiries | Manual org IDs in partnerships |

**Outcome:** **Partial** — commercially usable; lacks dedicated international onboarding data model.

### C.4 Service provider

| Step | Spec | Built | Gap |
|------|------|-------|-----|
| Register + category | Service partner type | `SERVICE_PROVIDER` + service listings | |
| Location + coverage | Match rules | `/partner/service-requests` coverage editor | City-level radius not modeled (state-level) |
| Service request | Submit requirement | `/services/request` | |
| Match | Platform matches providers | `ServiceRequestMatch` max 5 | |
| Lead → job | Accept → in progress → complete | Partner inbox + tracking token | |
| Enquiry path | Alternate intake | `/enquiry?service=` | Service vertical enquiries may stay admin queue |

**Outcome:** **Journey complete** at MVP; spec “service centre network” is representational via partner coverage, not a public map.

### C.5 Training institute

| Step | Spec | Built | Gap |
|------|------|-------|-----|
| Register | Training institute type | `TRAINING_INSTITUTE` | |
| Institute profile | Accreditation, locations | `/partner/training` profile API | |
| Courses & batches | CRUD + seats | Partner training module + public `/training/[id]` | |
| Student leads | Interest → inbox | “I’m interested” → `StudentTrainingLead` + `Lead` | **Dual records** per interest (consolidate later) |
| Public discovery | Course catalog | `/training` | |

**Outcome:** **Partial** — functional for institutes; student lead UX could be simplified to one record.

### C.6 Government / PSU

| Step | Spec | Built | Gap |
|------|------|-------|-----|
| Account | Government buyer | `GOVERNMENT_PSU` → `GOVERNMENT` role | |
| Tenders/schemes | Curated opportunities | `/government`, admin CRUD | No automated tender ingestion |
| Express interest | Lead capture | TENDER enquiry from opportunity detail | |
| Procurement | Post tender / RFP | Links to RFQ flow | No bid vault or document submission |
| Cart/orders | Enterprise buy | Same as buyer | |

**Outcome:** **Partial** — suitable for awareness and lead gen, not full e-procurement.

### C.7 Platform admin (operations narrative)

| Step | Built |
|------|-------|
| Land on ops home | `/admin` queue tiles |
| Triage enquiries | Route/assign/bulk |
| Moderate partners & listings | Applications + listings |
| Oversee service requests & gov content | Admin modules |
| Commerce & billing | Orders, analytics, `/admin/billing` |
| Governance | Users, audit log |

**Outcome:** **Exceeds** minimal spec implied ops for a launch MVP.

---

## Section D — Production readiness (P0/P1) with evidence

Mapping follows [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) and Phase 0 of [`PRD_REMAINING_TASKS.md`](./PRD_REMAINING_TASKS.md). **Ops items** cannot be marked Done from repository evidence alone.

### D.1 P0 — Launch blockers

| ID | Task | Repo / code evidence | Ops status |
|----|------|------------------------|------------|
| P0-H1 | Always-on VPS host | Deploy scripts exist (`deploy/scripts/remote-deploy-*.sh`) | **Open** |
| P0-H2 | pm2/systemd | Documented in deploy scripts | **Open** |
| P0-H3 | cloudflared system service | `deploy/cloudflared/`, `DEPLOY_CLOUDFLARE_TUNNEL.md` | **Open** |
| P0-H4 | Staging tunnel dev.garudhub.me | CICD on `dev` branch | **Open** |
| P0-H5 | Production tunnel garudhub.me | Documented | **Open** |
| P0-S1 | Strong JWT secrets | `backend/src/config/env.validation.ts` rejects weak secrets in production | **Code Done** — needs prod `.env` |
| P0-S2 | No demo seed on prod | Seed guard (`ALLOW_DEMO_SEED`) | **Code Done** |
| P0-S3 | Host-only `.env` | `.env.example` files | **Open** (process) |
| P0-S4 | Frontend prod env checklist | `frontend/.env.example` | **Open** |
| P0-S5 | `GARUD_DEPLOY_ENV=production` | Razorpay live validation | **Open** on prod host |
| P0-D1–D4 | Postgres persistent, migrate, backup, URL | `docker-compose.prod.example.yml`, migrate in deploy scripts | **Open** except script presence |
| P0-SEC1 | Swagger off prod | `backend/src/main.ts`, `swagger.setup.ts` | **Done** |
| P0-SEC2 | Rate limits | `ThrottlerModule`, env-tunable; IP forward fix in Next proxy | **Done** (tune in prod) |
| P0-SEC5 | Razorpay webhook HMAC | PAYMENTS_RUNBOOK + raw body + header forward | **Done** in code — **prove on host** |
| P0-PAY1–P5 | Live keys, webhook URL, staging smoke, deploy env | `PAYMENTS_RUNBOOK.md` | **Open** Biz/Ops |
| P0-F1–F2 | Persistent uploads | Local `UPLOAD_DIR` default | **Open** volume policy |
| P0-M1 | Health check | `GET /api/v1/health` | **Done** |
| P0-M2 | Logs | JSON logs + `x-request-id` middleware | **Done** — aggregation **Open** |
| P0-G1–G4 | Branch policy, CI, prod deploy, tags | `.github/workflows/dev-ci.yml`, `remote-deploy-prod.sh` | **Partial** — main CI optional P1 |

### D.2 P1 — First 30 days (selected)

| ID | Task | Evidence | Status |
|----|------|----------|--------|
| P1-1 | httpOnly cookies vs localStorage JWT | Documented risk in PRODUCTION_READINESS | **Open** |
| P1-2 | Helmet + WAF | Not in repo | **Open** |
| P1-3 | Dedicated API host + CORS | Same-origin proxy today | **Open** |
| P1-4 | S3/R2 uploads | Local disk only | **Open** |
| P1-5 | Managed Postgres | Documented pooling guide | **Open** |
| P1-6 | main branch CI | dev-ci only | **Open** |
| P1-7 | Sentry / uptime | Not integrated | **Open** |
| P1-8 | Partner subscription billing | Built Phase 6; live Razorpay Subscriptions = runbook | **Partial** |

### D.3 Code vs ops split (summary)

**Implemented in repository:** env validation, Swagger guard, throttling, seed block, payment webhook hardening, structured logging, CRM export/webhook, notification abstraction, deploy scripts, health endpoint, rate-limit IP forwarding fix.

**Requires operator execution:** VPS, tunnels, secrets rotation, backups restore drill, live payment proof, SMTP for real email, persistent volumes, merge `dev` → `main`, production smoke checklist completion.

---

## Section E — Risk register

| ID | Category | Risk | Likelihood | Impact | Mitigation |
|----|----------|------|------------|--------|------------|
| R1 | Ops | Mac/manual tunnel or non-supervised processes cause downtime | High if unchanged | High | Complete P0-H1–H3 |
| R2 | Security | JWT in localStorage (XSS exfiltration) | Medium | High | P1-1 httpOnly cookies; CSP |
| R3 | Security | Origin API exposed without Cloudflare → rate limit bypass | Low if misconfigured | Medium | Keep tunnel-only ingress; P1-3 if splitting API |
| R4 | Payments | Live webhook not proven on prod domain | Medium | High | P0-PAY2/PAY4 checklist |
| R5 | Data | Upload loss on redeploy without volume | Medium | Medium | P0-F1 volume or P1-4 object storage |
| R6 | UX | Users land on snapshot pages — no cart/session | Medium | Medium | Migrate top snapshots; SEO redirects |
| R7 | Legal | Privacy policy / retention not automated | Medium | Medium | P2-3 policy + purge jobs |
| R8 | Product | Training dual lead records confuse partners | Low | Low | Consolidate schema in backlog |
| R9 | Scale | In-memory rate limits with pm2 cluster | Low until scale | Medium | Redis throttler store |
| R10 | CRM | Webhook events dropped on restart | Low | Medium | CSV backfill; future outbox |
| R11 | Brand | Visual gap vs premium wireframe hurts enterprise trust | Medium | Medium | Design pass + hero assets |
| R12 | Commerce | Single-vendor cart policy misunderstood | Low | Low | Documented in cart UX + PAYMENTS_RUNBOOK §7 |

---

## Section F — Recommended 30 / 60 / 90 day roadmap

### Days 0–30 — Production launch gate (Phase 0)

**Goal:** Safe traffic on **garudhub.me** with rollback story.

1. Provision VPS (2 vCPU / 4 GB), Docker Postgres with volume, pm2 for API + web, cloudflared systemd units for staging and prod.
2. Configure production `.env`: strong JWT, `GARUD_DEPLOY_ENV=production`, live Razorpay, webhook secret, SMTP, `ADMIN_NOTIFY_EMAIL`.
3. Run `prisma migrate deploy` (20 migrations at baseline), seed **only** if non-prod; verify `UPLOAD_DIR` on persistent disk.
4. Execute staging smoke ([`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) § Smoke test scripts) on dev.garudhub.me including test checkout and enquiry 429 sanity.
5. Backup + **restore drill** once; document RTO.
6. Merge **`dev` → `main`**, deploy prod, run prod smoke (small live payment + webhook).
7. Operationalize log grep by `x-request-id` for support.

**Product freeze recommendation:** Avoid large feature diffs during launch week; hotfix via `dev` → cherry-pick if needed.

### Days 31–60 — Hardening and UX unity (P1 + marketing)

1. **P1-1** httpOnly session cookies; document break-glass for mobile apps later.
2. **P1-7** Sentry + uptime on `/health`.
3. Migrate **next 5–10** high-traffic snapshot slugs (government-projects-schemes, scrap-recycling, industries-we-serve) to React or bridge redirects.
4. Mobile: notification bell in drawer; buyer events for in-app notifications.
5. SMTP production monitoring (bounce handling).
6. Tune throttle env vars from real 429 telemetry.

### Days 61–90 — Depth and revenue

1. **P1-4** R2/S3 private uploads with signed URLs.
2. **P1-8** Live partner subscriptions: runbook §4–5, verify entitlements in prod.
3. Marketplace: optional **featured** flag + admin toggle for merchandising.
4. Training: consolidate student lead + `Lead` into single inbox row.
5. Partnerships: org picker UX + notification on decision.
6. Design sprint: cinematic home hero, ecosystem illustration, dark CTA bands per spec §5.
7. Load test connection pool; adjust `DATABASE_URL` params per PRODUCTION_READINESS pooling guide.

**Explicit deferrals (business decision):** COD path, multi-vendor cart, tender bid vault, DGCA portal integration, finance lender APIs.

---

## Appendix

### A. Route inventory summary (React platform)

**Public / marketing:** `/`, `/about-us`, `/services`, `/services/[vertical]`, `/services/request`, `/services/track/[token]`, `/b2b-partners`, `/marketplace` (+ compare, vendors, listings, distributor, partners), `/enquiry`, `/training`, `/training/[id]`, `/government`, `/government/[id]`.

**Auth:** `/auth/login`, `/auth/register`, `/auth/change-password`.

**Buyer / government:** `/buyer/rfqs`, `/buyer/rfqs/new`, `/buyer/rfqs/[id]`, `/buyer/cart`, `/buyer/checkout`, `/buyer/orders`, `/buyer/orders/[id]`, `/buyer/messages`.

**Partner:** `/partner` (+ application, documents, catalog, services, service-requests, training, leads, enquiries, rfqs, orders, partnerships, messages, analytics, subscription, activity).

**Admin:** `/admin` (+ applications, enquiries, leads, service-requests, gov-opportunities, partnerships, listings, orders, analytics, billing, users, audit-log).

**Proxies:** `/platform-api/v1/*` → NestJS; legacy `/api/*` rewrite for snapshot assets.

Full living map: [`ROUTE_MAP.md`](./ROUTE_MAP.md).

### B. Open checkboxes from PRD_REMAINING_TASKS (Phase 0 + deferrals)

**Phase 0 — all unchecked (ops):** P0-H1 through P0-H5, P0-S1 through P0-S5 (host config), P0-D1–D4, P0-PAY1–P3, P0-F1–F2, P0-M1–M2 (ops side), P0-G1–G4, P0-SEC5 (env on prod), P0-SEC5 webhook secret on prod host.

**P1 ops still open:** P1-1 through P1-7 (P1-8 subscription prep marked done in code).

**Product deferrals:** COD payment path (Phase 4, conditional on business).

**Partial items called out in PRD (not blockers):** featured marketplace module, partnership org picker, message notifications, analytics dedupe, live subscription go-live proof, CRM lead-status webhook, automated data purge jobs.

### C. Key file references for auditors

| Area | Path |
|------|------|
| Home spec blocks | `frontend/lib/platform/home-content.ts` |
| Header CTAs | `frontend/lib/platform/header-nav.ts` |
| Partner subnav | `frontend/components/platform/PartnerSubnav.tsx` |
| Admin subnav | `frontend/lib/platform/admin-ops.ts` |
| Snapshot bridge | `frontend/lib/snapshot-bridge.ts` |
| Account types | `backend/prisma/schema.prisma` |
| Env validation | `backend/src/config/env.validation.ts` |
| PDP actions | `frontend/app/(platform)/marketplace/listings/[id]/page.tsx` |

### D. Document maintenance

Re-run this audit when:

- `main` production launch completes (refresh Section D scores),
- Snapshot count drops below ~25 files (refresh Section B),
- Prisma schema adds major personas (refresh Section A journeys),
- Phase 0 checklist items flip to checked in `PRD_REMAINING_TASKS.md`.

---

*End of detailed PRD audit — baseline `dev` @ `e1c75af`, 4 November 2026.*
