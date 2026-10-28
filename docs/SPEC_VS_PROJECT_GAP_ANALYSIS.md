# GarudHub — Spec vs Current Project Gap Analysis

**Date:** 2026-10-22  
**Spec source:** `docs/DECODE_JWT_SPEC.txt` (wireframe / blueprint extracted from JWT decode workflow; filename is misleading — content is the **GarudHub website UI blueprint**, not JWT technical notes)  
**Code baseline:** `docs/CODE_LEVEL_STATUS.md` + spot verification on branch `feature/task-003-004-payments-workflow` @ `9e72591` (`main` @ `1048262` is essentially README-only)  
**Blueprint docx:** No `decode_jwt.docx` in repo; spec txt is the only blueprint artifact here.

---

## Executive summary (for Nigmanand)

**Short answer:** Vision doc ke hisaab se product abhi **~half-built** hai — transactional B2B (marketplace, KYC, RFQ, cart, payments, admin) kaafi aage hai, lekin **lead-generation ecosystem** (services hub workflows, enquiries, partner leads/analytics, training batches, messaging) abhi mostly **marketing copy + legacy enquiry form** par atka hua hai.

| Pillar | Honest completion vs spec | One-line read |
|--------|---------------------------|---------------|
| **UI** | **~58%** | Platform screens strong; home + most marketing still HTML snapshots; partner dashboard spec modules mostly missing as screens |
| **UX** | **~48%** | Register→verify→list→RFQ→order path workable; service/training/gov journeys break at enquiry.php or dead CTAs |
| **Backend** | **~52%** | 15 Prisma models cover commerce + RFQ; no Lead/Enquiry/Message/Partnership/Course entities |
| **Integrations** | **~38%** | Razorpay + UTR + webhook OK; enquiry still PHP/upstream proxy; no notifications/CRM/subscription billing |

**Top 3 reasons the project feels scattered (“bikhra hua”):**

1. **Do alag surfaces, ek origin** — `/` and ~47 URLs are cloned HTML snapshots; `(platform)` is React with `MarketingShell`. Same brand, different stack, different nav density (mega menu vs minimal platform patterns). `PlatformShell.tsx` exists but is **unused** — layout always uses marketing chrome even on `/admin` and `/partner`.
2. **Spec = full ecosystem; code = commerce spine** — Blueprint promises 8 service verticals + leads/enquiries/partnerships/analytics; implementation invested in **catalog moderation, cart/checkout, RFQ Phase 3, fulfillment, admin GMV** — marketing still sells the wider story.
3. **Branch + doc drift** — Real product lives on a long feature branch (~99 files vs `main`); `PROJECT_STATUS_DETAILED.md` is stale; new React pages (`/about-us`, `/services`, `/b2b-partners`) were WIP/untracked at last inventory. Stakeholders reading `main` or old docs see a different product than localhost on the feature branch.

**Deliverable path:** This file — `docs/SPEC_VS_PROJECT_GAP_ANALYSIS.md`.

---

## 1. Spec summary (what the doc promises)

### 1.1 Positioning & objective

| Section | Spec promise |
|---------|----------------|
| Vision | India’s **B2B Drone Ecosystem Platform** — connect Indian/international companies with buyers, distributors, dealers, service providers, training orgs, enterprises, government |
| Tagline | Connect. Partner. Sell. Service. Grow. |
| Objective | **Business-generation platform** (not an info site): list products/services, RFQs, leads, partnerships |

### 1.2 Site map & navigation

| Top-level | Spec children / notes |
|-----------|------------------------|
| **HOME** | Hero, who we are, ecosystem diagram, 8 service tiles, who can join, why GarudHub, how it works, industries, register CTA |
| **ABOUT US** | Story, vision, mission, ecosystem, sectors |
| **DRONE SERVICES** | Hub + 8 categories (see below) with detail pattern: description, applications, “Request service”, flow Submit→Match→Connect→Service |
| **MARKETPLACE** | Products, Components, Services, **Vendors**, **RFQ** |
| **B2B PARTNERS** | Manufacturer, OEM, International, Distributor, Dealer, Service provider, Training partner + partnership models |
| **JOIN GARUDHUB** | Account-type picker, **full business registration** (GST, CIN, docs), verification, login |
| **PARTNER DASHBOARD** | Profile, Products, Services, Leads, RFQs, Enquiries, Orders, Partnerships, Documents, Messages, Analytics, Subscription/Payments |

**Main nav (spec):** HOME \| ABOUT US \| DRONE SERVICES \| MARKETPLACE \| B2B PARTNERS \| JOIN GARUDHUB  
**Header CTAs:** LOGIN \| REGISTER AS B2B PARTNER

### 1.3 Eight service verticals (content + CTA)

| # | Vertical | Spec sub-themes |
|---|----------|-----------------|
| 01 | Drone Marketplace | Agri, survey, mapping, industrial, camera, components, accessories |
| 02 | Drone Training | Remote pilot, technician, specialized, institute network, corporate |
| 03 | DGCA & Compliance | Registration, documentation, regulatory assistance |
| 04 | Repair & Maintenance | Repair, AMC, inspection, spares, pickup, service centre network |
| 05 | Professional Services | Consultancy, survey/mapping, agri drone services, documentation |
| 06 | Finance & Insurance | Financing, EMI, insurance, loan assistance |
| 07 | Government Projects | Tenders, schemes, subsidies, procurement |
| 08 | Scrap & Recycling | Evaluation, scrap, buyback, recycling |

### 1.4 Marketplace + RFQ (spec)

| Element | Spec |
|---------|------|
| Discovery | Search bar, category chips (drones, components, payloads, accessories, services) |
| Listing detail | Manufacturer, specs, applications, location, MOQ, price/POR, warranty, docs |
| Actions | Request quote, contact supplier, send enquiry, **request demo**, **become distributor** |
| RFQ | Post requirement; flow requirement → verified vendors → quotations → comparison → buyer connection |
| Extra block | “Business opportunities” (distributor, dealership, projects, partnerships) |

### 1.5 Registration account types (spec)

Manufacturer, International, Distributor, Dealer, Service Provider, Training Institute, Technology Company, **Buyer/Enterprise**, **Government/PSU** — single flow with company fields + document upload + verification → dashboard active.

### 1.6 Personas & journeys (spec)

| Persona | Journey (abbrev.) |
|---------|-------------------|
| **Buyer** | Search → compare → RFQ → vendor quotes → contact → transaction |
| **Partner (generic)** | Register → verify → profile → products/services → leads |
| **International** | Register → verify → profile → list → Indian leads → distributor/dealer → projects |
| **Indian manufacturer** | Register → list → RFQ → enquiry → quotation → business |
| **Service provider** | Register → service category + location → service request → lead → job |
| **Training institute** | Register → institute profile → **courses → batches → student leads** |

### 1.7 Design direction (spec)

Premium aviation/B2B; cinematic heroes; light backgrounds; dark CTA bands; rounded service cards; India+global visuals; strong “Register as B2B Partner” everywhere.

---

## 2. UI coverage matrix

| Spec area | Expected screens / flows | Implemented routes / surfaces | Coverage % | Gap notes |
|-----------|--------------------------|-------------------------------|------------|-----------|
| **Home** | Full spec blocks + CTAs | `/` via `app/route.ts` **HTML snapshot** (not React); content largely mirrors legacy garudhub.com | **~70%** content, **~40%** spec nav alignment | React home not built; snapshot nav may not match new mega-menu targets |
| **About Us** | Story, vision, mission, ecosystem | `/about-us` React under `(platform)` + MarketingShell | **~85%** | Vision/mission/ecosystem present; depends on uncommitted/WIP polish |
| **Drone Services hub** | 8 pillars + per-service detail + request flow | `/services` React with anchor sections `#training`…`#recycling` | **~55%** | All 8 pillars as **marketing sections**; no per-vertical app routes; CTAs → `/enquiry.php` or marketplace |
| **B2B Partners** | Types + models + register | `/b2b-partners` React + anchor sections | **~80%** | Spec “PROJECT PARTNER” folded into copy; no dynamic partner directory |
| **Marketplace browse** | Search, categories, featured | `/marketplace` + `MarketplaceClient` (tabs/sections, API listings) | **~65%** | No spec **search bar** (server/client full-text); no dedicated “featured” module; no `/marketplace/vendors` index |
| **Marketplace listing detail** | Full PDP + all CTAs | `/marketplace/listings/[id]` | **~75%** | RFQ + enquiry + distributor link present; **no “Request demo”**; add-to-cart for priced SKUs |
| **Marketplace vendors** | Vendor directory | `/marketplace/partners/[orgId]` **storefront only** | **~35%** | No vendor list page |
| **RFQ (buyer)** | Post + compare + connect | `/buyer/rfqs`, `/new`, `/[id]` | **~90%** | Comparison matrix + accept→order; POR quotes cannot accept to order |
| **RFQ (partner)** | Invite inbox + quote | `/partner/rfqs`, `/[id]` | **~90%** | Matches spec vendor side of RFQ |
| **Join / Register** | Account types + rich form + docs in one page | `/auth/register` (light company fields) + `/partner/application` + `/partner/documents` | **~75%** | Spec single-page registration split across signup + post-login KYC (reasonable UX, not wireframe-identical) |
| **Login** | Partner login | `/auth/login` | **~95%** | Role-based redirect |
| **Partner dashboard (spec modules)** | 12 sidebar modules | `/partner` overview + subnav: Application, Documents, Catalog, Orders, RFQs | **~45%** | **Missing UI routes:** Leads, Enquiries, Services (distinct from catalog), Partnerships, Messages, Analytics, Subscription/Payments |
| **Partner products** | List/manage | `/partner/catalog/*` | **~90%** | Moderation gate aligned with “verified vendors” story |
| **Partner services** | Service listings as first-class hub | Service **`ListingType.SERVICE`** in same catalog | **~60%** | No separate “Services” dashboard module |
| **Buyer cart/checkout/orders** | Commerce | `/buyer/cart`, `/checkout`, `/orders`, `/orders/[id]` | **~85%** | Payments modal + stepper; gov role included |
| **Admin** | Platform ops | `/admin`, `/admin/applications/[id]`, `/admin/listings/*`, `/admin/orders/*` | **~70%** vs spec | Spec implied broader admin; no user management, no enquiry queue, no partnership moderation |
| **Legacy marketing** | Blog, legal, old service landings | `app/[...slug]/route.ts` (~47 manifest paths) | **~90%** parity with cloned site | Competes visually with new React pages; link localization partial |
| **Enquiry** | Lead capture integrated | `/enquiry.php` snapshot + `app/api/enquiry` proxy to **production PHP** | **~50%** UI, **~15%** platform integration | Not in partner/buyer dashboards; not in Prisma |
| **Design system** | Premium unified | Marketing CSS + `platform.css` + snapshot assets | **~60%** | Two visual systems; platform footer still says “local dev” on unused `PlatformShell` path |

**UI pillar estimate:** **~58%** — weighted toward transactional platform UI; marketing migration and partner dashboard modules drag the average down.

---

## 3. UX coverage matrix

| Journey | Spec steps | What works today | Coverage % | Friction / gaps |
|---------|------------|------------------|------------|-----------------|
| **Partner: register → verify → list → get leads** | Register → docs → approve → catalog → leads/RFQs | Register → `/partner/application` → docs → admin approve → `/partner/catalog` → RFQs/orders | **~72%** | **“Leads”** = RFQs/orders only; no enquiry inbox, no analytics, no “views” performance block from wireframe |
| **Buyer: search → compare → RFQ → quotes → deal** | Search marketplace → RFQ → compare → contact/transaction | Browse tabs → listing → RFQ new/detail → compare → accept priced quote **or** cart checkout | **~78%** | Weak **search**; compare is RFQ-quote matrix not product compare; government buyer = same as buyer (no tender UX) |
| **International partner** | Market entry → list → distributor network | Account type `INTERNATIONAL_COMPANY` + same partner path | **~65%** | Story on `/b2b-partners`; no dedicated international onboarding or distributor matching |
| **Indian manufacturer** | List → RFQ → enquiry → quote | Catalog + RFQ path | **~75%** | Enquiry goes to legacy form, not threaded to partner dashboard |
| **Service provider** | Category + location → service request → job | Can publish **service listings**; buyers use RFQ or enquiry | **~40%** | No “Submit requirement → match → connect” **service workflow** backend |
| **Training institute** | Profile → courses → batches → student leads | `TRAINING_INSTITUTE` account + training **listings** in marketplace | **~25%** | No courses/batches/leads model or UI |
| **Government / PSU** | Projects, tenders, procurement | `GOVERNMENT` role + `GOVERNMENT_PSU` account; RFQ/cart/checkout | **~35%** | No tenders/schemes/subsidy modules; `/services#government` is marketing only |
| **Service vertical (any of 8)** | Request service on hub | `/services` section → **Enquire** → `/enquiry.php` | **~30%** | User leaves platform mental model; no status tracking |
| **Admin: trust & safety** | Verify partners, govern marketplace | KYC queue + listing moderation + orders/payments | **~80%** for commerce trust | No enquiry triage, no partnership approvals |
| **Cross-surface navigation** | One coherent nav | Logged-in: MarketingHeader with mega menus + dashboard link | **~55%** | Home snapshot vs React inner pages; buyer dashboard link is **“My RFQs”** only (orders/cart in header via cart link) |

**UX pillar estimate:** **~48%** — core B2B commerce journeys are testable end-to-end; ecosystem and service journeys stop at marketing/enquiry.

---

## 4. Backend coverage matrix

| Spec module / capability | Spec expectation | Implemented (Prisma / NestJS) | Coverage % | Gap notes |
|--------------------------|------------------|-------------------------------|------------|-----------|
| **Identity & roles** | Partner, buyer, gov, admin login | `User`, JWT, refresh, roles incl. `GOVERNMENT` | **~90%** | Tokens in localStorage (not httpOnly) |
| **Account types (10)** | All join types | `AccountType` enum matches spec list | **~95%** | |
| **Partner KYC** | Submit → verify → approve | `Organization`, documents, audit logs, admin approve/reject | **~85%** | Audit log UI mostly admin listing detail only |
| **Catalog / products** | Marketplace products + specs | `PartnerListing`, categories, media, moderation | **~85%** | |
| **Marketplace API** | Public catalog | `GET /marketplace/listings`, partner profile | **~75%** | No full-text search/pagination contract |
| **Cart & checkout** | B2B purchase | Cart, place order, GSTIN on order | **~85%** | Single-vendor cart |
| **Orders & fulfillment** | Partner fulfill, buyer track | Status, carrier, tracking, serials | **~85%** | |
| **Payments** | Subscription/payments on dashboard | Razorpay intent, UTR, webhook, admin verify | **~70%** for **buyer order pay**; **~0%** partner subscription | `CASH_ON_DELIVERY` enum unused |
| **RFQ & quotations** | Full RFQ lifecycle | `Rfq`, invites, `Quotation`, accept→`Order` | **~90%** | Phase 3 drone specs implemented |
| **Leads** | Lead objects in dashboard | — | **~0%** | RFQ invites approximate “RFQ leads” only |
| **Enquiries** | Enquiry module | Proxy to garudhub.com PHP | **~10%** | No `Enquiry` model |
| **Partnership requests** | Partnerships sidebar | Fields on org (`partnershipTypes`) | **~15%** | No request/workflow entity |
| **Messages** | In-app messaging | — | **~0%** | |
| **Analytics** | Views, enquiries, performance | — | **~0%** | |
| **Training** | Courses, batches, student leads | Training as **listing category** only | **~10%** | |
| **Service matching** | Match service requirement to providers | — | **~0%** | |
| **Government tenders** | Tenders/schemes | — | **~0%** | |
| **Notifications** | Email/in-app for leads | — | **~5%** | Not part of 15-model schema |
| **Admin users** | User/role CRUD | Seed + register only | **~0%** | |

**Backend pillar estimate:** **~52%** — strong **commerce + RFQ core**; spec’s lead-gen and vertical workflows largely absent.

**Integrations estimate:** **~38%** — Razorpay path real; enquiry and legacy `/api/*` still tied to upstream PHP; no CRM, email pipeline, or partner billing.

---

## 5. Overall completion (honest % by pillar)

| Pillar | % vs `DECODE_JWT_SPEC.txt` | What’s solid | What’s missing |
|--------|----------------------------|--------------|----------------|
| **UI** | **58%** | Marketplace, partner catalog, buyer/admin consoles, 3 React marketing flagship pages | Partner dashboard modules, vendor index, React home, unified chrome |
| **UX** | **48%** | End-to-end partner onboarding + listing; buyer RFQ→order; cart/checkout | Service/training/gov journeys; enquiry loop; search/compare product UX |
| **Backend** | **52%** | 11 migrations, payments, RFQ Phase 3, moderation | Leads, enquiries, messaging, partnerships, training entities, service matching |
| **Integrations** | **38%** | Razorpay + UTR + webhook | Native enquiry API, notifications, subscriptions, production payment hardening |

**Single-number narrative:** Treat the spec as **100% ecosystem vision**. The repo delivers roughly **half** of that vision, but **~75–80% of a narrower “B2B marketplace + RFQ + payments MVP”** slice the code actually targets.

---

## 6. Why it feels scattered (diagnosis)

### 6.1 Root causes

| # | Cause | Evidence in repo |
|---|--------|------------------|
| 1 | **Two-track marketing vs platform** | `PROJECT_TWO_TRACKS.md`: snapshots at `/` + slugs vs `(platform)` React; bridging via `localizeSnapshotHtml` and middleware redirects |
| 2 | **Feature branch sprawl vs `main`** | `main` ≈ README; ~99 files / +15k LOC on `feature/task-003-004-payments-workflow`; stakeholders on wrong branch see “empty” project |
| 3 | **Doc drift** | `PROJECT_STATUS_DETAILED.md` (Oct 20) contradicts `CODE_LEVEL_STATUS.md` on routes, RFQ→order, migrations; spec txt was untracked |
| 4 | **Nav / shell inconsistencies** | All platform routes use **MarketingShell** + mega header; dead **`PlatformShell`**; home snapshot nav ≠ React `/services` anchors |
| 5 | **Admin split across concerns** | Admin subnav covers applications/listings/orders only — no single “operations” home for enquiries/leads/partnerships |
| 6 | **Enquiry not wired to product** | Listing/services CTAs → `/enquiry.php` → upstream PHP; partner dashboard has no enquiry/leads module |
| 7 | **Eight service verticals are marketing-only** | `/services` describes verticals; backend has no ServiceRequest, TrainingBatch, Tender, etc. |
| 8 | **Blueprint breadth vs implementation focus** | Engineering completed TASK-003/004/005 (payments, orders, RFQ specs); spec’s sidebar modules (Messages, Analytics, Subscription) never scheduled in schema |
| 9 | **Buyer vs partner mental model** | Buyers get RFQ-first dashboard link; partners get catalog/RFQ — spec promised symmetric “Enquiries” and “Performance” for partners |
| 10 | **Hybrid WIP marketing migration** | React `/about-us`, `/services`, `/b2b-partners` plus modified header — partially uncommitted; rest of site still clone |

### 6.2 Consolidation recommendations (prioritized)

1. **Merge feature branch to `main` with migration runbook** — Single source of truth for demos and client review; stops “which repo state is real?” confusion.
2. **Pick one chrome strategy** — Either extend MarketingShell deliberately everywhere **or** use PlatformShell for `/partner`, `/buyer`, `/admin` only; delete or wire dead code; fix platform footer copy for production.
3. **Replace enquiry.php with first-party API + admin queue** — Minimal `Enquiry` model, Nest POST, partner/admin inbox later; remove production PHP proxy dependency for new leads.
4. **Publish a living “Spec ↔ Route” map** — One table (this doc §2) maintained in README; deprecate stale status docs or add banner pointing to `CODE_LEVEL_STATUS.md`.
5. **Home route decision** — React home aligned to spec blocks **or** snapshot with guaranteed link parity to `/services`, `/b2b-partners`, `/marketplace`; avoid two homes diverging.
6. **Partner dashboard: name what exists** — Rename/label RFQs+orders as “Commercial leads” until real Leads/Enquiries modules ship; reduces wireframe expectation gap.
7. **Phase next backend as “Lead spine”** — Enquiry + optional `Lead` from RFQ/listing views before Messages/Analytics; training/gov as separate phases tied to spec §4 journeys.

---

## 7. Recommended focus order for cohesion (not a full rebuild)

Order optimizes **felt coherence** and **sales-demo clarity**, not implementing every spec page.

| Phase | Focus | Outcome |
|-------|--------|---------|
| **A — Truth in repo** | Merge branch, freeze `CODE_LEVEL_STATUS.md` as canonical, archive stale detailed status | Everyone tests same build |
| **B — Surface clarity** | Chrome decision (§6.2 #2); home link parity; committed marketing pages | Nav stops “jumping” between eras |
| **C — Lead loop v1** | Native enquiry + admin list; listing enquiry creates retrievable record | Services CTAs stop feeling fake |
| **D — Partner dashboard honesty** | Overview widgets: open RFQs, orders, listing views (when analytics exists); roadmap sidebar items greyed | Matches spec layout without overclaiming |
| **E — Marketplace discoverability** | Server-side search/filter pagination | Buyer journey matches spec “search products” |
| **F — Vertical depth (pick one)** | e.g. Training **or** Service requests **or** Gov tenders — one vertical end-to-end | Proves ecosystem story beyond commerce |
| **G — Integrations hardening** | Production Razorpay, email notifications for KYC/RFQ | Enterprise credibility |

**Defer (unless business priority):** In-app messaging, partner subscription billing, full vendor directory, product compare matrices, React rewrite of all 47 snapshots.

---

## Appendix: Spec ↔ code quick reference

| Spec nav item | Primary implementation |
|---------------|------------------------|
| HOME | Snapshot `/` |
| ABOUT US | `/about-us` |
| DRONE SERVICES | `/services` |
| MARKETPLACE | `/marketplace`, `/buyer/rfqs/*` |
| B2B PARTNERS | `/b2b-partners`, `/auth/register?type=partner` |
| JOIN GARUDHUB | `/auth/register`, `/auth/login` |
| PARTNER DASHBOARD | `/partner/*` (subset of modules) |

---

*Generated for gap review against `docs/DECODE_JWT_SPEC.txt`. Re-run after merge to `main` or when platform route count / Prisma models change materially.*
