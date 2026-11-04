# GarudHub — PRD remaining tasks

**Date:** November 4, 2026 (Phases 1–4 implemented; Phase 3 platform/marketing unification — see [`ROUTE_MAP.md`](./ROUTE_MAP.md); POR RFQ accept and per-vertical service routes remain)  
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
- [x] **P1-8 — Partner subscription billing prep** — After B7 live keys runbook (Phase 6). *Built (v1) in Phase 6; production go-live steps in [`PAYMENTS_RUNBOOK.md`](./PAYMENTS_RUNBOOK.md) §4–5 (needs live Razorpay with Subscriptions enabled).*

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
- [x] **Services per-vertical app routes (optional v1)** — Beyond `/services` anchors; trackable “Request service” per vertical (P-UI-02, gap §2 Drone Services ~55%). *Done in Phase 8: `/services/request?category=…` + `/services/track/[token]`, `/training`, `/government`.*

---

## Phase 2 — Partner dashboard modules

Spec sidebar: Profile, Products, Services, Leads, RFQs, Enquiries, Orders, Partnerships, Documents, Messages, Analytics, Subscription ([`DECODE_JWT_SPEC.txt`](./DECODE_JWT_SPEC.txt) §1.2).

- [x] **Dedicated Partner “Services” module** — First-class hub beyond `ListingType.SERVICE` in catalog (P-UI-08, gap §2 ~60%). *v1 done: `/partner/services` + `GET /partner/services` — service listings with moderation status, 30-day views and lead counts, service-vertical coverage (compliance/repair/training/finance/recycling), recent service leads, “Add a service” deep link (`/partner/catalog/new?type=SERVICE`). Partial: coverage is inferred from catalog categories (no explicit vertical field on listings); no per-vertical public routes (Phase 1 open item).*
- [x] **Leads module UI** — Replace “Soon” stub with live routes (PartnerSubnav roadmap labels). *Done: `/partner/leads` pipeline (stage KPIs, win rate, type/status/search filters, stage change, private note, email reply); `GET /partner/leads` gained `intent` + `q` filters.*
- [x] **Enquiries module UI** — Full inbox vs admin-only today (spec Partner dashboard Enquiries). *Done: `/partner/enquiries` split from leads — inbox with unread/read/closed, search, detail pane, reply-by-email, mark unread/close/reopen; new `GET/PATCH /partner/enquiries` scoped to the partner org.*
- [x] **Partnerships module** — Request/workflow beyond `partnershipTypes` on org (P-BE-04, gap §4 ~15%). *v1 done: `PartnershipRequest` model; partner `/partner/partnerships` (submit, withdraw, status + admin note, approved incoming partners); admin `/admin/partnerships` queue (approve / under review / decline). Partial: no notifications on decision, `partnershipTypes` on org not synced from approvals, target partner is entered as an organization ID (no picker), no counterparty accept step.*
- [x] **Messages MVP (C2)** — Threaded partner–buyer messaging (gap §4 ~0%; defer depth until C1). *v1 done: `Conversation` + `Message` models; buyer `/buyer/conversations` and partner `/partner/conversations` APIs; `/buyer/messages` + `/partner/messages` two-pane UI with 15s polling and unread tracking; “Message supplier” on PDP and vendor profile. Partial: no email/push notifications, attachments, admin moderation/read access, or realtime transport.*
- [x] **Analytics overview (C3)** — Listing views, enquiry counts, RFQ performance block from wireframe (gap §4 ~0%). *v1 done: `ListingView` counter recorded on public PDP fetch; `GET /partner/analytics?days=` and `/partner/analytics` (views trend + top listings, enquiries, lead funnel/win rate, RFQ response/acceptance, orders + GMV). Partial: views are not deduped or bot-filtered, owner’s own views are counted, no export/CSV.*
- [x] **Subscription / payments dashboard (C4)** — Partner billing plans; depends on live Razorpay hardening (P-BE-02). *Placeholder done (no billing): `/partner/subscription` + `GET /partner/subscription` read-only “Founding Partner” plan, entitlements, usage, roadmap. Superseded by Phase 6: real plans + Razorpay subscriptions now live on the same route.*
- [x] **Partner overview widgets** — Open RFQs, orders, pending enquiries without overclaiming unbuilt modules (roadmap Phase D). *Done: `GET /partner/overview` drives dashboard widgets (RFQs awaiting quote, orders to fulfill, new leads, unread enquiries/messages, catalog by status, 30d views, open partnership requests); PartnerSubnav “Soon” tabs removed.*
- [x] **Audit log visibility for partners** — Optional: moderation/KYC events relevant to org (admin global viewer is Phase 5). *Done: `GET /partner/audit-log` + `/partner/activity` (KYC + listing moderation events merged, newest first).*

> **Deploy note:** run `npx prisma migrate deploy` (migrations `20261103180000_enquiry_routing_leads`, `20261103200000_partner_dashboard_modules`).

---

## Phase 3 — Platform / marketing unification

One coherent nav and chrome across snapshot era and React platform (gap §6.1 two-track marketing).

- [x] **Platform chrome decision (B6)** — `PlatformShell` for `/partner`, `/buyer`, `/admin` **or** documented keep-`MarketingShell` + delete dead code (P-UI-11). *Done: decision = keep `MarketingShell` for all React routes; `PlatformShell.tsx` deleted (its CSS classes were never defined). Documented in [`ROUTE_MAP.md`](./ROUTE_MAP.md).*
- [x] **Fix production footer copy** — Remove “local dev” and unused PlatformShell drift (gap §2 Design ~60%). *Done by deleting `PlatformShell`; the only live footer is `MarketingFooter` (no dev copy).*
- [x] **React home at `/` (C7)** — Spec hero, ecosystem, 8 tiles, register CTA—or enforce ≥90% nav parity on snapshot (P-UI-01, gap §2 Home). *Done: `app/(platform)/page.tsx` + `lib/platform/home-content.ts` (hero, who we are, ecosystem flow, 8 service tiles, who can join, why, how it works, industries, register CTA); `app/route.ts` snapshot home removed. Partial: hero uses the shared green-gradient B2B hero (no photo) and “who we are” has no ecosystem graphic.*
- [x] **Marketing snapshot bridge — top 5 paths** — High-traffic slugs → React or guaranteed link parity (P-UI-12). *Done: `/partner-with-us`, `/drone-training`, `/dgca-compliance`, `/repairs-maintenance`, `/finance-insurance` now redirect to React (`lib/snapshot-bridge.ts` + middleware), joining existing `/drone-marketplace`, `/drone-accessories`, `/enquiry.php`. ~30 other snapshots (blog, legal, remaining services/partner pages) stay HTML.*
- [x] **Unified header CTAs** — LOGIN | REGISTER AS B2B PARTNER on all surfaces (spec §1.2). *Done: shared constants in `lib/platform/header-nav.ts`; React header + mobile drawer use them; snapshot pages get the same CTAs injected before “Contact Us”. Partial: snapshot headers are static, so they never show logged-in state.*
- [x] **Buyer header parity audit** — My Orders, My RFQs, cart visible everywhere logged-in buyer/gov (P-UX-04). *Done on all React routes (desktop + mobile drawer now list My RFQs · My Orders · Messages · Cart; duplicate “My RFQs” removed). Partial: legacy snapshot pages cannot show cart/orders (static HTML).*
- [x] **International partner journey UX** — Dedicated onboarding hints beyond account type enum (P-UX-05, gap §3 ~65%). *Done: `InternationalPartnerHints` on register (INTERNATIONAL_COMPANY or non-India country), `/partner/application`, and the dashboard onboarding checklist; links to a pre-filled India-entry enquiry. Partial: hints only — no country-specific document requirements or backend fields.*
- [x] **Living Spec ↔ Route map** — Maintain gap §2 matrix in repo README or this doc appendix (roadmap consolidation #4). *Done: [`ROUTE_MAP.md`](./ROUTE_MAP.md) (spec nav → route, role headers, bridge table, maintenance rule).*
- [x] **Archive or banner stale status docs** — Point readers to `CODE_LEVEL_STATUS.md` (gap §6.1 doc drift). *Done: banner added to the audit/gap/plan/task reports, backlog and roadmap; `CODE_LEVEL_STATUS.md` marked as a baseline pointing to this doc.*

---

## Phase 4 — Marketplace PRD gaps

Spec marketplace: search, categories, vendors, PDP CTAs, RFQ, business opportunities ([`DECODE_JWT_SPEC.txt`](./DECODE_JWT_SPEC.txt) §1.4).

- [x] **Marketplace discoverability polish** — Filters, empty states, featured module if spec-required (P-UI-03, P-UX-01 follow-ups). *Done: location (state), pricing (listed vs price-on-request) and sort (newest / price asc / desc) filters on `/marketplace` (URL params `state`, `price`, `sort`; backend `GET /marketplace/listings` extended, `GET /marketplace/filters` facets); distinct “no results” empty state (RFQ + enquiry CTAs, reset filters) vs. “listings coming soon”; result count in search hint. Partial: no ranked “Featured products” module (no featuring/ranking signal exists — spec’s featured row is approximated by newest-first); categories keep Components + Payloads merged in one tab.*
- [x] **“Business opportunities” block** — Distributor, dealership, projects, partnerships surfacing (spec §1.4 extra block). *Done: `BusinessOpportunitiesBlock` on `/marketplace` (content in `lib/platform/business-opportunities.ts`) — distributor/dealership → distributor flow; projects/partnerships → `/enquiry?intent=PARTNER` with subject. Partial: “Projects” is an enquiry, not a project listing board (see Phase 8 tenders).*
- [x] **Product compare matrix (non-RFQ)** — Side-by-side SKU compare v1 if prioritized (defer note in gap §7). *v1 done: “Compare” toggle on marketplace cards + PDP, sticky `CompareTray`, `/marketplace/compare?ids=` (max 4, shareable URL, “differences only”, request-quote CTAs); backend `GET /marketplace/listings/compare` (published-only, no view counted). Partial: specs are free text, so no structured spec rows/normalisation; selection is per-browser (localStorage), not per account.*
- [x] **Become distributor flow** — PDP CTA → partnership or lead capture with context (spec listing actions). *Done: PDP “Become a Regional Distributor” → `/marketplace/distributor?listing=<id>` (territory, experience, volume, company; DISTRIBUTOR/DEALER type) → enquiry with `intent=DISTRIBUTOR` + `listingId` ⇒ routed to vendor as a Lead + admin/partner email. Verified partners also get a link to the formal partnership request (`/partner/partnerships?target=<org>`). Partial: structured fields are packed into the enquiry message (no dedicated schema); no accept/decline loop back to the applicant.*
- [x] **RFQ quotation compare v2** — Enhance buyer matrix UX beyond current Phase 3 compare (roadmap Sprint 3). *Done: summary strip (active bids, lowest price, spread %, fastest delivery), sort (price / lead time / payload / endurance / warranty / newest), best-in-column highlighting for price, lead time, payload, endurance, warranty (ties and rejected bids ignored), badges in cards view; logic in `lib/platform/quote-compare.ts` (tested). Partial: no shortlist/notes, no CSV export, no side-by-side vendor attachments.*
- [x] **Marketplace RFQ entry prominence** — Spec nav MARKETPLACE includes RFQ sub-journey (§1.2). *Done: “B2B RFQ — What are you looking for?” block with 5-step “How RFQ works” on `/marketplace` (plus existing hero CTA), RFQ CTA in empty/no-result states and the vendor directory.*
- [x] **Public vendor filters** — Category, location, verification badges on `/marketplace/vendors` (extend B3). *Done: state, partner type (account type) and “sells/offers” category filters (backend `GET /marketplace/vendors` extended), reset + empty state with RFQ CTA, “Verified (KYC)” + partner-type badges. Partial: all listed vendors are KYC-approved, so the badge is uniform (no tiered badges); location is state-level only (no city/radius).*
- [ ] **COD payment path** — `CASH_ON_DELIVERY` enum wired end-to-end if business requires (gap §4 Payments). *Deferred (Phase 4): conditional on a business decision; B2B drone orders are paid via Razorpay/NEFT and the enum is unused in code.*

---

## Phase 5 — Admin & auth

Spec-implied platform ops beyond commerce trust (gap §2 Admin ~70%, §4 Admin users ~0%).

- [x] **Global admin audit log viewer (B5)** — KYC + listing moderation logs without opening single record (P-UI-13). *Done: `GET /admin/audit-log` + `/admin/audit-log` page — one newest-first timeline merging KYC decisions, listing moderation, partnership decisions, enquiry routing and admin user/role changes; filters: type, free-text search (company/listing/note/email), date range, actor (API); paginated (25/page) with per-type counts; each row deep-links to the record. Partial: partnership and enquiry-routing events are derived from the request/enquiry rows (no history tables), so only the latest decision per request and currently-routed enquiries appear; merge-on-read caps the window at 1,100 events per source (fine at launch volume); no CSV export.*
- [x] **Admin user / role CRUD** — Beyond seed + register (gap §4 Admin users). *Done: `/admin/users` + `GET/POST /admin/users`, `PATCH /admin/users/:id/role|disabled`, `POST /admin/users/:id/reset-password` (all `PLATFORM_ADMIN`-only). Create admin (no org) with a one-time server-generated temporary password; promote any user to admin; demote an admin that owns an organization back to the role matching its account type; disable/re-enable (soft delete — blocks login, refresh and API access); reset password. Guards: no self role-change / disable / reset, last active admin can never be demoted or disabled, role changes and resets revoke refresh tokens. New `POST /auth/change-password` + `/auth/change-password` page; users on a temporary password (`mustChangePassword`) are redirected there and blocked from other pages until they change it. Every action is written to new `admin_user_audit_logs`. Partial: there is a single admin role (`PLATFORM_ADMIN`), so “only ADMIN can manage” means any admin can manage users (no super-admin tier); temporary password is shown to the admin once and shared out-of-band (no emailed invite link / forgot-password self-service); no hard delete; demoting console-created admins (no organization) is blocked.*
- [x] **Partnership moderation v1** — Admin queue for partnership requests (P-UI-09, Sprint 4). *Delivered with Phase 2: `/admin/partnerships` (approve / under review / decline + note).*
- [x] **Enquiry triage as default ops home** — Optional dashboard landing for operations (gap §6.1 #5). *Done: `/admin` is now the Operations home (`GET /admin/overview`): queue tiles for partner KYC, new/unrouted enquiries, stale partner leads, pending partnerships, listings awaiting moderation and orders with payment pending (highlighted when non-zero, “N need attention” badge), quick links and the 6 latest audit events. The KYC queue moved to `/admin/applications` (detail route unchanged).*
- [x] **Admin partnership with enquiry + leads** — Single “operations” narrative across subnavs. *Done: one `AdminSubnav` (source `lib/platform/admin-ops.ts`) — Ops Home · Partner Applications · Enquiry Queue · Partner Leads · Partnerships · Listing Moderation · Order Oversight · Users & Roles · Audit Log — on every admin page; new read-only `/admin/leads` (`GET /admin/leads`, status + “stale” filter) closes the enquiry → lead → partnership loop. Partial: admin leads view is read-only (partners own status changes).*

> **Deploy note (Phase 5):** run `npx prisma migrate deploy` (migration `20261104120000_admin_users_audit`: `users.must_change_password`, `users.disabled_at`, `admin_user_audit_logs`). Additive and backwards compatible.

---

## Phase 6 — Commerce extensions

Extend transactional spine toward spec subscription and multi-vendor stories.

- [x] **Partner subscription billing (C4)** — Razorpay subscription + plan entitlements (P-BE-02, P1-8). *v1 done: `PartnerPlan` + `PartnerSubscription` models; admin-configurable plans/entitlements at `/admin/billing` (`/admin/billing/*`: create/edit, “Sync to Razorpay” plan creation, subscriber counts + est. MRR, subscriptions list, manual no-charge assign); partner `/partner/subscription` is now a real upgrade path (plan cards, Razorpay Subscriptions checkout, signature verify, cancel at period end) via `GET/POST /partner/subscription[/checkout|/verify|/cancel]`; `subscription.*` webhooks keep status current. Entitlement **enforced**: `listingLimit` on listing creation (existing listings never removed). Billing modes: `LIVE` (keys), `SANDBOX` (no keys, non-production, no money), `UNAVAILABLE` (production without keys → paid checkout disabled). Seed plans (Founding Partner free default, Growth ₹4,999, Enterprise ₹14,999) are placeholders created on first read. Partial: `featuredPlacement` / `rfqPriority` are stored and displayed but do not yet change ranking; no proration or paid→paid switching (cancel first); no GST invoices/billing history/dunning in-app; admin assign takes an organization ID; live Razorpay Subscriptions not exercised here (no live keys) — verify per runbook §4. Migration `20261104140000_partner_subscription_billing`.*
- [x] **Payments hardening runbook (B7)** — Live webhook validation, env matrix doc linked from PRODUCTION_READINESS (P-INT-02). *Done: [`PAYMENTS_RUNBOOK.md`](./PAYMENTS_RUNBOOK.md) (env matrix, webhook go-live checklist, staging vs production procedure, incident levers) linked from PRODUCTION_READINESS and DEPLOY docs. Code hardening shipped alongside: webhook now requires a valid HMAC over the raw body (previously skipped when the header was absent, and the Next proxy dropped the header — now forwarded); `rawBody` enabled; amount check, idempotent replays, `payment.failed` / `refund.processed` handling; sandbox ids and unconfigured-gateway verification can no longer mark orders PAID (blocked on `GARUD_DEPLOY_ENV=production`, and only valid for sandbox-created intents elsewhere); verification requires an intent created for that order. Partial: live-key webhook delivery must still be proven on the real host (checklist §3); no webhook event-id dedup table (idempotency is state-based); partial refunds do not change order status.*
- [x] **Multi-vendor cart (if in scope)** — Spec B2B may imply; today single-vendor cart (gap §4 Cart). *Decision: **single seller per order, documented** ([`PAYMENTS_RUNBOOK.md`](./PAYMENTS_RUNBOOK.md) §7) — multi-vendor sourcing is covered by RFQ; split baskets would need parent-basket + per-vendor sub-orders + partial payments. UX improved: cross-seller add (409) now shows the policy on the product page with *Go to cart / Clear cart & add this item / Raise an RFQ instead*; cart page states the rule (`lib/platform/cart.ts`). Not implemented: split carts / multi-seller checkout (revisit if buyers ask).*
- [x] **Order / RFQ analytics for admin GMV** — Extend existing admin orders metrics (partial today). *Done: `GET /admin/analytics?days=7–365` + `/admin/analytics` page (linked from Ops quick links, Order Oversight and the admin subnav): GMV with prior-period change, paid vs awaiting payment, AOV, cancellation rate, daily/weekly GMV trend chart, payment + fulfilment mix, RFQ-vs-direct order split, top 5 vendors, RFQ funnel (created → quoted → accepted → ordered), invite response/quote rates, quotes per RFQ, acceptance rate. Partial: funnel cohorts are RFQs created in the window (recent RFQs under-count); trend reads up to 20k orders in the window; no CSV export; no per-category/region GMV.*


> **Deploy note (Phase 6):** run `npx prisma migrate deploy` (migration `20261104140000_partner_subscription_billing`, additive: `partner_plans`, `partner_subscriptions`). Set `RAZORPAY_WEBHOOK_SECRET` on staging and production — unsigned webhooks are now rejected. Set `GARUD_DEPLOY_ENV=staging` on the dev host.

---

## Phase 7 — Integrations & NFR

Non-functional and third-party expectations (gap §4 Integrations ~38%).

- [x] **CRM export or webhook** — Enquiry/lead sync for sales team (P-INT-01). *Done (both): admin CSV `GET /admin/enquiries/export` (filters status/intent/routing/from/to, ≤10k rows, enquiry + routed partner + lead id/status; formula-injection-safe) with an **Export CSV (CRM)** button on `/admin/enquiries`; optional outbound webhook `enquiry.created` / `enquiry.routed` signed `X-Garud-Signature: sha256=HMAC(CRM_WEBHOOK_SECRET, "<ts>.<body>")` (needs both `CRM_WEBHOOK_URL` + `CRM_WEBHOOK_SECRET`; HTTPS enforced in prod; 5 s timeout, 3 attempts with backoff; never blocks the enquiry). Details: [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md#crm-export--webhook-p-int-01). Partial: no lead-status-change event (partner status updates are not pushed), no persistent outbox/replay (events dropped if the API restarts mid-retry — backfill via CSV), no native Salesforce/HubSpot connector.*
- [x] **Notification service abstraction** — Email first; in-app later (gap §4 Notifications). *Done: `NotificationService` now depends on a `MailProvider` port (`MAIL_PROVIDER` token; default SMTP/log `MailService` — swap SES/SendGrid without touching callers) plus a real minimal `InAppNotification` table (`in_app_notifications`) and `InAppNotificationService`. `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all` for any signed-in user; header **bell with unread badge + dropdown** (polls every 60 s). Bell events: new/assigned lead → partner owner, KYC approved/rejected → partner owner, RFQ invite → invited vendor owners. Partial: no buyer-facing events yet (quote received, order status), no per-user email/in-app preferences, no websocket push, no retention job (see data retention notes), bell not in the mobile drawer.*
- [x] **Structured logging + request IDs** — Production debuggability (P0-M2 extension). *Done: `RequestIdMiddleware` assigns/reuses `x-request-id` (validated), echoes it on the response (Next proxy forwards it both ways), and an AsyncLocalStorage context stamps it on every log line incl. the CRM webhook; `AppLogger` emits JSON lines in production / readable text in dev (`LOG_FORMAT`, `LOG_LEVEL`); one access-log line per request (no query strings, `/health` 2xx suppressed). Partial: no Sentry/metrics (P1-7); no frontend error→request-id surfacing; logs are stdout only (ship with pm2/journald).*
- [x] **Rate limit and abuse review** — Tune auth/enquiry/public catalog after prod traffic (P0-SEC2 done in code; ops tune). *Done: limits are now env-tunable (`THROTTLE_{GLOBAL,AUTH,AUTH_REFRESH,ENQUIRY}_{LIMIT,TTL_MS}`, defaults unchanged) and a tuning guide lives in [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md#rate-limits--abuse-review-p0-sec2-tuning). **Bug found + fixed:** the Next `/platform-api` proxy did not forward the client IP, so every visitor shared one rate-limit bucket (e.g. 5 enquiries/min site-wide) — it now forwards `cf-connecting-ip` as `x-forwarded-for`. Partial: counters are in-memory per process (needs Redis storage before multi-instance); real thresholds still need tuning from production 429 data.*
- [x] **Data retention & privacy alignment** — P2 compliance (PRODUCTION_READINESS P2-3). *Done as **policy stub**: data inventory with PII flags, proposed retention per table, starter purge SQL (expired refresh tokens, old read notifications) and open compliance items — [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md#data-retention--privacy-stub--p2-3). Not done: no automated purge jobs, no published privacy policy / DSAR procedure, retention periods need Biz/legal sign-off.*
- [x] **CDN for static/snapshot assets** — Performance at scale (P2-4). *Done (doc + trivial config): `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` on `/assets/*` in `next.config.ts`; Cloudflare cache/bypass rule guidance in [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md#cdn-for-static--snapshot-assets-p2-4). Partial: Cloudflare rules are an Ops dashboard step; snapshot filenames are not content-hashed (so no `immutable`); uploads stay private/API-served until S3/R2 (P1-4).*
- [x] **DB connection pooling review** — Under load on VPS/managed DB (P2-4). *Done as **review/doc**: Prisma pool sizing, per-topology recommended `DATABASE_URL` params (single VPS, pm2 cluster, PgBouncer/pooled managed, TLS), connection-budget formula and monitoring checklist — [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md#database-connection-pooling-p2-4); example in `backend/.env.example`. Partial: no load test run (values are conservative defaults, not measured); `directUrl` for migrations behind a pooler is documented but not wired into the Prisma schema.*

> **Deploy note (Phase 7):** run `npx prisma migrate deploy` (migration `20261104160000_in_app_notifications`, additive: `in_app_notifications`). All new env vars are optional (`CRM_WEBHOOK_URL`/`CRM_WEBHOOK_SECRET` must be set together; `LOG_FORMAT`, `LOG_LEVEL`, `THROTTLE_*`, `CRM_WEBHOOK_*` tuning). In production, logs switch to JSON automatically — update any `grep`-based log checks.

---

## Phase 8 — Vertical journeys (training, service matching, gov/tenders)

Spec eight service verticals + persona journeys ([`DECODE_JWT_SPEC.txt`](./DECODE_JWT_SPEC.txt) §1.3, §1.6). **Design (one coherent flow):** every vertical intake is an `Enquiry` (admin queue, CRM webhook, ack email, vertical lead type `REPAIR/FINANCE/SCRAP/TRAINING/TENDER/SERVICE`) and, for provider-served verticals, a linked `ServiceRequest` that is matched by category + state. Dependency is one-way: `EnquiriesModule → ServiceRequestsModule` (`POST /service-requests` lives in `EnquiriesModule`), `TrainingModule → EnquiriesModule`; `ServiceRequestsModule` never imports enquiries (no circular DI).

### Training institute

- [x] **Courses + batches schema** — Beyond training category listings (P-BE-05, C5, gap §3 Training ~25%). *Done: `TrainingCourse` + `TrainingBatch` (seats, status auto OPEN/FULL), partner CRUD `/partner/training/*` (training-institute accounts), public `GET /training/courses[/:id]` limited to published courses of approved institutes, public `/training` + `/training/[id]` (upcoming batches).*
- [x] **Student leads UI** — Institute inbox for course interest (spec Training institute journey). *Done: “I’m interested” on `/training/[id]` → `POST /training/courses/:id/interest` → routed enquiry + `Lead` (intent `TRAINING`) in the institute’s inbox; each interest also writes a `StudentTrainingLead` row (course/batch/city, status NEW→CONTACTED→ENROLLED→CLOSED, partner note) listed and staged on `/partner/training` via `GET/PATCH /partner/training/leads`; the generic Lead also appears in `/partner/leads?intent=TRAINING`. Partial: two parallel records per interest (student lead + Lead) — consolidate later.*
- [x] **Institute profile extensions** — Accreditation, batch schedule, locations (wireframe training pillar). *Done: `InstituteProfile` (accreditation, DGCA RPTO approval no., about, locations, schedule notes) via `GET/PUT /partner/training/profile`; shown on the public course page.*

### Service provider matching

- [x] **Service request entity (C8)** — Submit requirement → match providers → connect (gap §4 Service matching ~0%). *Done: `ServiceRequest` / `ServiceRequestMatch` / `ServiceRequestUpdate`; public `/services/request` (+ `POST /service-requests`, optional auth links the buyer), email tracking link + `/services/track/[token]` (cancel); partner inbox `/partner/service-requests` (offered → accept/decline); requester contact is revealed only after accept; admin `/admin/service-requests` (rematch, assign to a verified partner, cancel/complete).*
- [x] **Location + category matching rules** — Spec service provider journey (§1.6). *Done: verified partners matched by declared coverage (categories + states, editable on `/partner/service-requests`) or inferred from approved SERVICE listing categories; same-state first, otherwise nationwide (no state restriction) providers, max 5, explicit coverage ranks first. Pure rules unit-tested.*
- [x] **Job status tracking** — Post-connect lifecycle for service verticals (§1.3 flow Submit→Match→Connect→Service). *Done: SUBMITTED → MATCHED → IN_PROGRESS (accept) → COMPLETED (partner) / CANCELLED, optimistic-lock transitions, timeline of updates visible to requester, status emails.*

### Government / PSU & tenders

- [x] **Tenders / schemes module (C6)** — Not marketing-only `/services#government` (P-UX-05, gap §3 Gov ~35%). *Done: `GovOpportunity` (TENDER / SCHEME / SUBSIDY, DRAFT → PUBLISHED → CLOSED), public `/government` (type/state/search, expiry) + `/government/[id]`, admin CRUD `/admin/gov-opportunities`. Opportunities are curated by admins (no automated scraping of tender portals).*
- [x] **Procurement-oriented buyer UX** — Tender posting, scheme links, subsidy info structure (spec vertical 07). *Done: structured issuing body / reference / estimated value / closing countdown / eligibility / official source link; “Express interest” creates a `TENDER` enquiry prefilled from the opportunity; “Post tender / RFP” links to the RFQ flow. Partial: no bid-submission or document vault for tenders.*
- [x] **DGCA & compliance vertical depth** — Optional workflow beyond listing/RFQ (vertical 03). *Done as a service-request vertical (`COMPLIANCE` intake: need, drone model) with matching + tracking. Partial: no document checklist or DGCA portal integration.*

### Other verticals (finance, scrap, repair)

- [x] **Finance & insurance partner listings workflow** — EMI/insurance lead capture (vertical 06). *Done: `FINANCE_INSURANCE` intake (type, amount, applicant) → `FINANCE` enquiry/lead type + matched finance partners. Partial: no eligibility calculator or lender integrations.*
- [x] **Repair & AMC service requests** — Tie to service matching or enquiries with type (vertical 04). *Done: `REPAIR_AMC` intake (model, issue, fleet, service mode) → `REPAIR` lead type + matching + tracking.*
- [x] **Scrap & recycling intake** — Evaluation/buyback lead form with routing (vertical 08). *Done: `SCRAP_RECYCLING` intake (model, condition, qty, batteries, year) → `SCRAP` lead type + matching. Partial: no valuation engine / pickup scheduling.*

> **Deploy note (Phase 8):** run `npx prisma migrate deploy` (migration `20261105120000_vertical_journeys`: new enums incl. `EnquiryIntent` TRAINING/FINANCE/REPAIR/SCRAP/TENDER, `training_*`, `student_training_leads`, `service_requests*`, `gov_opportunities`, `institute_profiles`, organization `service_categories` / `service_states`). Additive; applied with `prisma migrate deploy` on the local dev DB and verified drift-free (`prisma migrate diff` schema vs. DB is empty) — still verify on staging. No seed data for courses/tenders. Partners set service coverage on `/partner/service-requests`; training institutes manage courses on `/partner/training`; admins publish tenders at `/admin/gov-opportunities`.

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
