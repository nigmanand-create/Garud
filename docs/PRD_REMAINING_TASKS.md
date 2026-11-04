# GarudHub — PRD remaining tasks

**Date:** November 3, 2026 (Phase 1 lead loop implemented; POR RFQ accept and per-vertical service routes remain)  
**Spec:** [`DECODE_JWT_SPEC.txt`](./DECODE_JWT_SPEC.txt) (wireframe / GarudHub UI blueprint; `decode_jwt.docx` is not in-repo)  
**Gap analysis:** [`SPEC_VS_PROJECT_GAP_ANALYSIS.md`](./SPEC_VS_PROJECT_GAP_ANALYSIS.md)  
**Code baseline:** Active product on **`dev`** branch (staging → [dev.garudhub.me](https://dev.garudhub.me)); merge **`dev` → `main`** for production ([`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md))

---

## Executive summary

Against the full ecosystem PRD, the codebase is approximately **~60% complete** (UI ~58%, UX ~48%, backend ~52%, integrations ~38%; weighted narrative **~58–62%**). The **commerce spine**—marketplace, KYC, catalog moderation, cart/checkout, RFQ Phase 3, payments, admin orders/KYC—is largely shippable on **`dev`**. What remains is **lead-loop integration** (partner enquiry inbox, email), **partner dashboard modules** (Leads, Messages, Analytics, Subscription), **platform/marketing unification** (chrome, React home, snapshot migration), **vertical journeys** (training, service matching, gov/tenders), and **production ops** (P0 from production readiness).

Treat **~75–80%** of a narrower “B2B marketplace + RFQ + payments MVP” slice as done; this list tracks closure of the **full PRD vision**.

---

## How to use this doc

1. Work phases **in order** where dependencies apply (Phase 0 can run in parallel with Phase 1).
2. When a task meets its done criteria, change `- [ ]` to `- [x]` and add a one-line note if helpful.
3. Update the **Date** at the top when you materially refresh the list.
4. Cross-check shipped work against [`PARTIAL_COMPLETION_BACKLOG.md`](./PARTIAL_COMPLETION_BACKLOG.md) and [`CODE_LEVEL_STATUS.md`](./CODE_LEVEL_STATUS.md).
5. Production launch gates use **Phase 0** only—not PRD 100% completion ([`PROJECT_COMPLETION_ROADMAP.md`](./PROJECT_COMPLETION_ROADMAP.md)).

---

## Phase 0 — Launch / ops

Production P0 from [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md); safe **`main` → garudhub.me** traffic.

### Hosting & process

- [ ] **P0-H1 — VPS or always-on host** — Move off Mac + manual tunnel (PRD NFR: always-on B2B platform).
- [ ] **P0-H2 — Process supervisor** — pm2/systemd for API + web with boot persistence (deploy scripts exist).
- [ ] **P0-H3 — cloudflared as system service** — Not a Terminal window ([`DEPLOY_CLOUDFLARE_TUNNEL.md`](./DEPLOY_CLOUDFLARE_TUNNEL.md)).
- [ ] **P0-H4 — Staging tunnel** — dev.garudhub.me → Next :3001 (`dev` branch CI).
- [ ] **P0-H5 — Production tunnel** — garudhub.me → Next :3001 (optional API ingress for webhooks).

### Secrets, database, security

- [ ] **P0-S1 — Strong JWT secrets on prod** — ≥32 chars; boot validation when `NODE_ENV=production`.
- [ ] **P0-S2 — No demo seed on prod** — Block `prisma:seed` unless explicit override.
- [ ] **P0-S3 — Host-only `.env`** — Never commit; rotate if leaked.
- [ ] **P0-S4 — Frontend prod env checklist** — `NEXT_PUBLIC_*`, `BACKEND_URL` ([`frontend/.env.example`](../frontend/.env.example)).
- [ ] **P0-S5 — `GARUD_DEPLOY_ENV=production`** — Live Razorpay validation on prod host.
- [ ] **P0-D1 — Persistent Postgres volume** — Survives redeploy.
- [ ] **P0-D2 — `prisma migrate deploy` every deploy** — Both staging and prod.
- [ ] **P0-D3 — Backup + restore drill** — Daily `pg_dump` or managed snapshots; one verified restore.
- [ ] **P0-D4 — `DATABASE_URL` correctness** — Host/port matches environment.
- [ ] **P0-SEC5 — Razorpay webhook secret on prod** — Signature verification configured.

### Payments, files, monitoring, release

- [ ] **P0-PAY1 — Live Razorpay keys on prod** — `rzp_live_…` when `GARUD_DEPLOY_ENV=production`.
- [ ] **P0-PAY2 — Webhook URL on prod domain** — e.g. `/platform-api/v1/payments/webhook`.
- [ ] **P0-PAY3 — Staging checkout smoke** — Test keys on dev.garudhub.me before go-live.
- [ ] **P0-F1 — Persistent `UPLOAD_DIR`** — Partner docs and listing media survive redeploy.
- [ ] **P0-F2 — Upload backup policy** — Volume backup or accept re-upload for MVP.
- [ ] **P0-M1 — Post-deploy health check** — `GET /api/v1/health` green.
- [ ] **P0-M2 — Log retention + 5xx visibility** — pm2/systemd logs; Cloudflare analytics.
- [ ] **P0-G1 — Branch policy enforced** — `dev` = staging, `main` = production.
- [ ] **P0-G2 — PRs → `dev`, CI green** — [`.github/workflows/dev-ci.yml`](../.github/workflows/dev-ci.yml).
- [ ] **P0-G3 — Prod deploy from `main` only** — [`remote-deploy-prod.sh`](../deploy/scripts/remote-deploy-prod.sh).
- [ ] **P0-G4 — Release tags / changelog** — Rollback reference (P1 automation optional).

### P1 ops (first 30 days; still open)

- [ ] **P1-1 — httpOnly session cookies** — Replace localStorage JWT ([`P-BE-06`](./PARTIAL_COMPLETION_BACKLOG.md)).
- [ ] **P1-2 — Helmet + Cloudflare WAF** — Headers and edge rules.
- [ ] **P1-3 — Dedicated API host + CORS** — If mobile/third-party clients need direct API.
- [ ] **P1-4 — S3/R2 uploads** — Replace local disk ([`P-BE-07`](./PARTIAL_COMPLETION_BACKLOG.md)).
- [ ] **P1-5 — Managed Postgres + automated backups** — Neon/RDS/DO.
- [ ] **P1-6 — `main` branch CI + deploy workflow** — Mirror dev-ci.
- [ ] **P1-7 — Error tracking + uptime** — Sentry or equivalent on `/health`.
- [ ] **P1-8 — Partner subscription billing prep** — After B7 live keys runbook (Phase 6).

---

## Phase 1 — Lead loop (enquiries, partner inbox, email, leads)

Close spec **business-generation** loop: Submit → Match → Connect beyond RFQ-only leads ([`DECODE_JWT_SPEC.txt`](./DECODE_JWT_SPEC.txt) §1.1 objective, §3 journeys).

- [x] **Retire legacy enquiry.php primary path** — Redirect/snapshot links to `/enquiry`; remove PHP upstream dependency for new leads (gap §2 Enquiry, P-UI-10). *Done: `/enquiry.php` GET → 308 `/enquiry` (query kept), POST → 303 (no proxy to garudhub.com), `app/api/enquiry` PHP proxy deleted, snapshot/header/assistant links rewritten. Raw cloned HTML files still contain old form markup but are unreachable.*
- [x] **Enquiry UI on PlatformShell path** — First-party `/enquiry` wired in header, assistant, snapshots (spec integrated enquiry, not orphan form). *Done: `/enquiry` (platform route group) now accepts `listing`, `partner`, `intent`, `service` params; PDP “Request demo”/“Contact supplier” and partner profile “Contact partner” pass routing context.*
- [x] **Partner enquiry inbox (light)** — Read-only list of enquiries tagged to org/listing (gap §3 Partner ~72%, P-UX-03). *Done: `GET /partner/leads` + `/partner/enquiries` UI (status filter, counts, message view, status update).*
- [x] **Enquiry → partner routing rules** — Listing/service context assigns `organizationId` or queue for admin triage (spec “connect buyer to supplier”). *Done: listing → vendor, `partner` → verified org, else admin queue; admin `PATCH /admin/enquiries/:id/assign` re-routes or un-routes. Service-vertical enquiries intentionally stay in the admin queue (no auto provider matching — see Phase 8).*
- [x] **Transactional email on new enquiry** — Admin and/or partner notify (gap §4 Notifications ~5%, P-INT-01). *Done: admin (`ADMIN_NOTIFY_EMAIL`), routed partner, and submitter ack via `NotificationsModule`; nodemailer SMTP when `SMTP_HOST` set, otherwise log-only provider. Real SMTP credentials still needed per environment.*
- [x] **Email on KYC approve/reject and RFQ invite** — Enterprise credibility (roadmap Phase G). *Done: sent to organization `contactEmail` on admin approve/reject and per invited vendor on RFQ create (best-effort, never blocks the request).*
- [x] **Lead entity (C1)** — Non-RFQ intents (distributor, demo, service pillar) with partner inbox (gap §4 Leads ~0%). *v1 done: `Lead` model (status NEW→CONTACTED→QUALIFIED→WON/LOST) created whenever an enquiry is routed to a partner; `EnquiryIntent` GENERAL/PRODUCT/DEMO/DISTRIBUTOR/PARTNER/SERVICE. Partial: no dedicated distributor-request UI, RFQ→lead sync, or standalone leads module (Phase 2).*
- [x] **Admin enquiry queue enhancements** — Filters by source (listing, service vertical, demo), bulk status (P-UI-09 partial). *Done: filters for status/source/routing, bulk mark-read/close, per-row partner routing, new `CLOSED` status.*
- [ ] **POR RFQ accept → order** — Product rule + UI when quotation is price-on-request (gap §2 RFQ buyer ~90%, roadmap Sprint 2).
- [ ] **Services per-vertical app routes (optional v1)** — Beyond `/services` anchors; trackable “Request service” per vertical (P-UI-02, gap §2 Drone Services ~55%).

---

## Phase 2 — Partner dashboard modules

Spec sidebar: Profile, Products, Services, Leads, RFQs, Enquiries, Orders, Partnerships, Documents, Messages, Analytics, Subscription ([`DECODE_JWT_SPEC.txt`](./DECODE_JWT_SPEC.txt) §1.2).

- [x] **Dedicated Partner “Services” module** — First-class hub beyond `ListingType.SERVICE` in catalog (P-UI-08, gap §2 ~60%). *v1 done: `/partner/services` + `GET /partner/services` — service listings with moderation status, 30-day views and lead counts, service-vertical coverage (compliance/repair/training/finance/recycling), recent service leads, “Add a service” deep link (`/partner/catalog/new?type=SERVICE`). Partial: coverage is inferred from catalog categories (no explicit vertical field on listings); no per-vertical public routes (Phase 1 open item).*
- [x] **Leads module UI** — Replace “Soon” stub with live routes (PartnerSubnav roadmap labels). *Done: `/partner/leads` pipeline (stage KPIs, win rate, type/status/search filters, stage change, private note, email reply); `GET /partner/leads` gained `intent` + `q` filters.*
- [x] **Enquiries module UI** — Full inbox vs admin-only today (spec Partner dashboard Enquiries). *Done: `/partner/enquiries` split from leads — inbox with unread/read/closed, search, detail pane, reply-by-email, mark unread/close/reopen; new `GET/PATCH /partner/enquiries` scoped to the partner org.*
- [x] **Partnerships module** — Request/workflow beyond `partnershipTypes` on org (P-BE-04, gap §4 ~15%). *v1 done: `PartnershipRequest` model; partner `/partner/partnerships` (submit, withdraw, status + admin note, approved incoming partners); admin `/admin/partnerships` queue (approve / under review / decline). Partial: no notifications on decision, `partnershipTypes` on org not synced from approvals, target partner is entered as an organization ID (no picker), no counterparty accept step.*
- [x] **Messages MVP (C2)** — Threaded partner–buyer messaging (gap §4 ~0%; defer depth until C1). *v1 done: `Conversation` + `Message` models; buyer `/buyer/conversations` and partner `/partner/conversations` APIs; `/buyer/messages` + `/partner/messages` two-pane UI with 15s polling and unread tracking; “Message supplier” on PDP and vendor profile. Partial: no email/push notifications, attachments, admin moderation/read access, or realtime transport.*
- [x] **Analytics overview (C3)** — Listing views, enquiry counts, RFQ performance block from wireframe (gap §4 ~0%). *v1 done: `ListingView` counter recorded on public PDP fetch; `GET /partner/analytics?days=` and `/partner/analytics` (views trend + top listings, enquiries, lead funnel/win rate, RFQ response/acceptance, orders + GMV). Partial: views are not deduped or bot-filtered, owner’s own views are counted, no export/CSV.*
- [x] **Subscription / payments dashboard (C4)** — Partner billing plans; depends on live Razorpay hardening (P-BE-02). *Placeholder done (no billing): `/partner/subscription` + `GET /partner/subscription` read-only “Founding Partner” plan, entitlements, usage, roadmap. Real plans/Razorpay subscriptions remain Phase 6 “Partner subscription billing”.*
- [x] **Partner overview widgets** — Open RFQs, orders, pending enquiries without overclaiming unbuilt modules (roadmap Phase D). *Done: `GET /partner/overview` drives dashboard widgets (RFQs awaiting quote, orders to fulfill, new leads, unread enquiries/messages, catalog by status, 30d views, open partnership requests); PartnerSubnav “Soon” tabs removed.*
- [x] **Audit log visibility for partners** — Optional: moderation/KYC events relevant to org (admin global viewer is Phase 5). *Done: `GET /partner/audit-log` + `/partner/activity` (KYC + listing moderation events merged, newest first).*

> **Deploy note:** run `npx prisma migrate deploy` (migrations `20261103180000_enquiry_routing_leads`, `20261103200000_partner_dashboard_modules`).

---

## Phase 3 — Platform / marketing unification

One coherent nav and chrome across snapshot era and React platform (gap §6.1 two-track marketing).

- [ ] **Platform chrome decision (B6)** — `PlatformShell` for `/partner`, `/buyer`, `/admin` **or** documented keep-`MarketingShell` + delete dead code (P-UI-11).
- [ ] **Fix production footer copy** — Remove “local dev” and unused PlatformShell drift (gap §2 Design ~60%).
- [ ] **React home at `/` (C7)** — Spec hero, ecosystem, 8 tiles, register CTA—or enforce ≥90% nav parity on snapshot (P-UI-01, gap §2 Home).
- [ ] **Marketing snapshot bridge — top 5 paths** — High-traffic slugs → React or guaranteed link parity (P-UI-12).
- [ ] **Unified header CTAs** — LOGIN | REGISTER AS B2B PARTNER on all surfaces (spec §1.2).
- [ ] **Buyer header parity audit** — My Orders, My RFQs, cart visible everywhere logged-in buyer/gov (P-UX-04).
- [ ] **International partner journey UX** — Dedicated onboarding hints beyond account type enum (P-UX-05, gap §3 ~65%).
- [ ] **Living Spec ↔ Route map** — Maintain gap §2 matrix in repo README or this doc appendix (roadmap consolidation #4).
- [ ] **Archive or banner stale status docs** — Point readers to `CODE_LEVEL_STATUS.md` (gap §6.1 doc drift).

---

## Phase 4 — Marketplace PRD gaps

Spec marketplace: search, categories, vendors, PDP CTAs, RFQ, business opportunities ([`DECODE_JWT_SPEC.txt`](./DECODE_JWT_SPEC.txt) §1.4).

- [ ] **Marketplace discoverability polish** — Filters, empty states, featured module if spec-required (P-UI-03, P-UX-01 follow-ups).
- [ ] **“Business opportunities” block** — Distributor, dealership, projects, partnerships surfacing (spec §1.4 extra block).
- [ ] **Product compare matrix (non-RFQ)** — Side-by-side SKU compare v1 if prioritized (defer note in gap §7).
- [ ] **Become distributor flow** — PDP CTA → partnership or lead capture with context (spec listing actions).
- [ ] **RFQ quotation compare v2** — Enhance buyer matrix UX beyond current Phase 3 compare (roadmap Sprint 3).
- [ ] **Marketplace RFQ entry prominence** — Spec nav MARKETPLACE includes RFQ sub-journey (§1.2).
- [ ] **Public vendor filters** — Category, location, verification badges on `/marketplace/vendors` (extend B3).
- [ ] **COD payment path** — `CASH_ON_DELIVERY` enum wired end-to-end if business requires (gap §4 Payments).

---

## Phase 5 — Admin & auth

Spec-implied platform ops beyond commerce trust (gap §2 Admin ~70%, §4 Admin users ~0%).

- [ ] **Global admin audit log viewer (B5)** — KYC + listing moderation logs without opening single record (P-UI-13).
- [ ] **Admin user / role CRUD** — Beyond seed + register (gap §4 Admin users).
- [x] **Partnership moderation v1** — Admin queue for partnership requests (P-UI-09, Sprint 4). *Delivered with Phase 2: `/admin/partnerships` (approve / under review / decline + note).*
- [ ] **Enquiry triage as default ops home** — Optional dashboard landing for operations (gap §6.1 #5).
- [ ] **Admin partnership with enquiry + leads** — Single “operations” narrative across subnavs.

---

## Phase 6 — Commerce extensions

Extend transactional spine toward spec subscription and multi-vendor stories.

- [ ] **Partner subscription billing (C4)** — Razorpay subscription + plan entitlements (P-BE-02, P1-8).
- [ ] **Payments hardening runbook (B7)** — Live webhook validation, env matrix doc linked from PRODUCTION_READINESS (P-INT-02).
- [ ] **Multi-vendor cart (if in scope)** — Spec B2B may imply; today single-vendor cart (gap §4 Cart).
- [ ] **Order / RFQ analytics for admin GMV** — Extend existing admin orders metrics (partial today).

---

## Phase 7 — Integrations & NFR

Non-functional and third-party expectations (gap §4 Integrations ~38%).

- [ ] **CRM export or webhook** — Enquiry/lead sync for sales team (P-INT-01).
- [ ] **Notification service abstraction** — Email first; in-app later (gap §4 Notifications).
- [ ] **Structured logging + request IDs** — Production debuggability (P0-M2 extension).
- [ ] **Rate limit and abuse review** — Tune auth/enquiry/public catalog after prod traffic (P0-SEC2 done in code; ops tune).
- [ ] **Data retention & privacy alignment** — P2 compliance (PRODUCTION_READINESS P2-3).
- [ ] **CDN for static/snapshot assets** — Performance at scale (P2-4).
- [ ] **DB connection pooling review** — Under load on VPS/managed DB (P2-4).

---

## Phase 8 — Vertical journeys (training, service matching, gov/tenders)

Spec eight service verticals + persona journeys ([`DECODE_JWT_SPEC.txt`](./DECODE_JWT_SPEC.txt) §1.3, §1.6); pick **one vertical end-to-end** before spreading (roadmap Phase F).

### Training institute

- [ ] **Courses + batches schema** — Beyond training category listings (P-BE-05, C5, gap §3 Training ~25%).
- [ ] **Student leads UI** — Institute inbox for course interest (spec Training institute journey).
- [ ] **Institute profile extensions** — Accreditation, batch schedule, locations (wireframe training pillar).

### Service provider matching

- [ ] **Service request entity (C8)** — Submit requirement → match providers → connect (gap §4 Service matching ~0%).
- [ ] **Location + category matching rules** — Spec service provider journey (§1.6).
- [ ] **Job status tracking** — Post-connect lifecycle for service verticals (§1.3 flow Submit→Match→Connect→Service).

### Government / PSU & tenders

- [ ] **Tenders / schemes module (C6)** — Not marketing-only `/services#government` (P-UX-05, gap §3 Gov ~35%).
- [ ] **Procurement-oriented buyer UX** — Tender posting, scheme links, subsidy info structure (spec vertical 07).
- [ ] **DGCA & compliance vertical depth** — Optional workflow beyond listing/RFQ (vertical 03).

### Other verticals (finance, scrap, repair)

- [ ] **Finance & insurance partner listings workflow** — EMI/insurance lead capture (vertical 06).
- [ ] **Repair & AMC service requests** — Tie to service matching or enquiries with type (vertical 04).
- [ ] **Scrap & recycling intake** — Evaluation/buyback lead form with routing (vertical 08).

---

## Already completed (reference)

No checkboxes—verified on **`dev`** branch per [`PARTIAL_COMPLETION_BACKLOG.md`](./PARTIAL_COMPLETION_BACKLOG.md) and recent implementation passes.

- **Identity & roles** — JWT login/register, 10 `AccountType` values, `GOVERNMENT` role (gap §4 ~90%).
- **Partner KYC** — Application, documents, admin approve/reject, verification gates (gap §4 ~85%).
- **Partner catalog & listing moderation** — Submit-for-review, admin `/admin/listings`, marketplace/cart publish gates ([`ADMIN_P0_PLAN.md`](./ADMIN_P0_PLAN.md)).
- **Marketplace browse** — Public listings API, section tabs, **search `q`**, **pagination** `skip`/`take` (A2, B2, P-BE-01).
- **Marketplace PDP** — RFQ, enquiry context, add-to-cart, **Request demo** CTA (B4, P-UI-04).
- **Vendor directory** — `GET /marketplace/vendors` + `/marketplace/vendors` UI (B3, P-UI-05).
- **Buyer commerce** — Cart, checkout, orders, fulfillment stepper, `PaymentGatewayModal` (gap §2 ~85%).
- **RFQ Phase 3** — Drone specs on RFQ/quotation, buyer/partner RFQ UIs, accept priced quote → order (gap §4 RFQ ~90%).
- **Payments (buyer orders)** — Razorpay intent, NEFT/UTR, webhook, admin verify (gap §4 ~70% order pay).
- **Admin commerce ops** — Applications, listings moderation, orders/GMV, **enquiry queue** `/admin/enquiries` (native API).
- **Native enquiry API (B1)** — Prisma `Enquiry`, POST, admin list/status (replaces PHP-only backend for new records).
- **React marketing flagship pages** — `/about-us`, `/services`, `/b2b-partners` under `(platform)` (gap §2).
- **Home link parity (A6)** — Snapshot `/` CTAs localized to React routes (`snapshot-html.ts`).
- **Services pillar CTAs (P-UX-02)** — Primary paths to `/enquiry`, `/marketplace`, RFQ—not legacy PHP on `/services`.
- **Cart in global header (A1)** — `CartNavLink` for buyers in `MarketingHeader`.
- **Partner dashboard honesty (A3)** — Roadmap modules labeled “Soon” in `PartnerSubnav`.
- **Production code guards** — Swagger off in prod, rate limits, seed block, JWT strength checks ([`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) code column).
- **Deploy scripts & dev CI** — Remote deploy scripts, Cloudflare tunnel docs, **`dev`** branch workflow ([`CICD_DEV.md`](./CICD_DEV.md)).

---

## Related documents

| Doc | Purpose |
|-----|---------|
| [`SPEC_VS_PROJECT_GAP_ANALYSIS.md`](./SPEC_VS_PROJECT_GAP_ANALYSIS.md) | Pillar percentages and UI/UX/BE matrices |
| [`PARTIAL_COMPLETION_BACKLOG.md`](./PARTIAL_COMPLETION_BACKLOG.md) | Partial → Done inventory with file evidence |
| [`PROJECT_COMPLETION_ROADMAP.md`](./PROJECT_COMPLETION_ROADMAP.md) | Sprint 0–5+ sequencing |
| [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) | P0/P1/P2 ops checklist |
| [`CODE_LEVEL_STATUS.md`](./CODE_LEVEL_STATUS.md) | Routes, API map, migrations (canonical over stale status) |

---

*Generated November 3, 2026 from PRD gap analysis and backlog. Re-run after merge to `main` or when Prisma models / platform route count change materially.*
