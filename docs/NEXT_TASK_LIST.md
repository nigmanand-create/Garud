# GarudHub — NEXT task list

**Date:** 4 November 2026  
**Code baseline:** `dev` @ **`6c5da08`** (platform API wiring 100%, UX/nav fixes)  
**Purpose:** Ordered “what to do next” for launch and the following sprints — not a full PRD ledger.

**Source of truth (detail):**

- [FINAL_PRD_AUDIT_DETAILED.md](./FINAL_PRD_AUDIT_DETAILED.md) — completion scores, journeys, Section F roadmap  
- [PRD_REMAINING_TASKS.md](./PRD_REMAINING_TASKS.md) — Phase 0 / P1 checkboxes and phase history  
- [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) — P0/P1 ops tables and smoke procedures  
- [DEPLOY_RUNBOOK_STEP_BY_STEP.md](./DEPLOY_RUNBOOK_STEP_BY_STEP.md) — copy-paste host procedures (Phase 0)  
- [ARCHITECTURE_CONNECTIVITY_AUDIT.md](./ARCHITECTURE_CONNECTIVITY_AUDIT.md) — code wiring (100%); ops proof separate  
- [UX_AUDIT_REPORT_2026-11-05.md](./UX_AUDIT_REPORT_2026-11-05.md) — **primary dev coding backlog** (P0/P1 UX)

---

## Current dev coding focus (not QA/Ops)

**Already shipped on `dev`:** API proxy (incl. PUT/HEAD), `/api/v1` → platform rewrites, GOVERNMENT → `/government`, signed-out `/buyer/rfqs` → role login + auth timeout, buyer desktop **Account** menu, UX quick wins (`eaabd22`), **homepage React marketing parity** (`7c94b28`), **gov tender CSV bulk import** on `/admin/gov-opportunities` — see [`GOV_TENDER_IMPORT.md`](./GOV_TENDER_IMPORT.md).

**Code next (suggested order):**

1. ~~UX audit **P1 quick wins**~~ — done `eaabd22`; ~~marketplace mobile filters sheet~~ — done `312f0dc`; ~~optional: trim duplicate partner CTAs in body copy~~ — home final band + footer/mega nav dedupe (2026-11-08).  
2. ~~**Home / snapshot → React** design parity~~ — hero done `7c94b28`; optional: migrate remaining snapshot-only marketing pages.  
3. ~~**Blog/legal** snapshot migration~~ — **MDX/markdown CMS** `a611290` — see [`BLOG_LEGAL_MDX.md`](./BLOG_LEGAL_MDX.md); ~35 marketing HTML pages still snapshot (later pass).  
4. Fix only what **staging smoke** fails (checkout/webhook) — see open checkboxes below.  
5. **COD** — blocked on biz (**[NEXT-B1](./COD_DECISION.md#next-b1--three-options-for-biz)** / **[NEXT-B2](./COD_DECISION.md#gaps--what-next-b2-would-still-need-if-biz-approves)**) — see [`COD_DECISION.md`](./COD_DECISION.md).

**Parallel (not coding):** **NEXT-L2**, **P0-PAY3/4**, host Phase 0 — [`STAGING_SMOKE_GUIDE.md`](./STAGING_SMOKE_GUIDE.md).

---

## How to use

1. Work **top to bottom within a sprint** unless Ops and Dev can run hosting (Phase 0) in parallel with staging QA.
2. Mark progress: `- [ ]` → `- [x]`; add a short note (date, host, PR) when done.
3. **Launch is gated on Sprint Launch (Phase 0)** — product features on `dev` do not replace ops proof.
4. For acceptance detail, env keys, and runbooks, follow links above; this file stays one line per task.
5. Refresh the **Date** when you reorder or drop completed items.

---

## Executive summary

| Dimension | ~Completion | Next gate |
|-----------|-------------|-----------|
| **Full ecosystem PRD** (marketplace, partner dashboard, verticals, admin) | **~80–84%** | Polish + depth sprints below |
| **Narrow MVP** (marketplace + KYC + RFQ + cart/checkout + admin trust) | **~90–93%** | Staging smoke, then `dev` → `main` |
| **Production go-live readiness** (hosting, secrets, payments proof) | **~40–45%** (repo runbooks) | **Sprint Launch — execute P0 on host** |

**Leadership line:** The product is **demo- and staging-ready**; **garudhub.me public traffic waits on Phase 0 host execution**, not on building another core module.

---

## Sprint Launch (Phase 0) — production gate

Complete before treating production as live. Owner hints: **Ops** = infra/DNS/host, **Dev** = app/env/CI, **Biz** = Razorpay account, **QA** = smoke scripts.

### Hosting & process

- [x] **P0-H1** — Always-on VPS or cloud host — **P0** — App reachable 24/7 without a Mac or manual tunnel. *(Ops)* — *2026-11-04: [DEPLOY_RUNBOOK_STEP_BY_STEP.md](./DEPLOY_RUNBOOK_STEP_BY_STEP.md) §P0-H1 — **Ops runbook ready — execute on host**.*
- [x] **P0-H2** — Process supervisor for API + web — **P0** — `garudhub-api` and `garudhub-web` restart on crash and after reboot. *(Ops)* — *2026-11-04: `deploy/pm2/ecosystem.config.example.js` + systemd examples — **Ops runbook ready — execute on host**.*
- [x] **P0-H3** — `cloudflared` as system service — **P0** — Tunnel survives logout/reboot (not a Terminal session). *(Ops)* — *2026-11-04: runbook §P0-H3 — **Ops runbook ready — execute on host**.*
- [x] **P0-H4** — Staging tunnel — **P0** — `dev.garudhub.me` → Next `:3001` on the staging host. *(Ops)* — *2026-11-04: runbook §P0-H4 — **Ops runbook ready — execute on host**.*
- [x] **P0-H5** — Production tunnel — **P0** — `garudhub.me` → Next `:3001` (optional API ingress for webhooks). *(Ops)* — *2026-11-04: runbook §P0-H5 — **Ops runbook ready — execute on host**.*

### Secrets, database, security (host)

- [x] **P0-S1** — Production JWT secrets — **P0** — ≥32-char random access/refresh secrets set on prod; API boots clean. *(Ops/Dev)* — *2026-11-04: runbook §P0-S1 — **Ops runbook ready — execute on host**.*
- [x] **P0-S2** — No demo seed on prod — **P0** — `prisma:seed` not run on production unless explicit override. *(Ops)* — *2026-11-04: `remote-deploy-prod.sh` guard + runbook §P0-S2 — **Ops runbook ready — execute on host**.*
- [x] **P0-S3** — Host-only `.env` — **P0** — Secrets only on server; rotate if ever committed. *(Ops)* — *2026-11-04: runbook §P0-S3 — **Ops runbook ready — execute on host**.*
- [x] **P0-S4** — Frontend production env — **P0** — `NEXT_PUBLIC_*` and `BACKEND_URL` match [`frontend/.env.example`](../frontend/.env.example). *(Dev)* — *2026-11-04: expanded checklist + links to smoke, health, backup, RELEASE.*
- [x] **P0-S5** — `GARUD_DEPLOY_ENV=production` on prod — **P0** — Live Razorpay validation enabled on production host. *(Ops)* — *2026-11-04: runbook §P0-S5 — **Ops runbook ready — execute on host**.*
- [x] **P0-D1** — Persistent Postgres volume — **P0** — Data survives container/host redeploy. *(Ops)* — *2026-11-04: runbook §P0-D1 + compose example — **Ops runbook ready — execute on host**.*
- [x] **P0-D2** — `prisma migrate deploy` every deploy — **P0** — Staging and prod deploy scripts apply all migrations. *(Dev/Ops)* — *2026-11-04: wired in `remote-deploy-{dev,prod}.sh`.*
- [x] **P0-D3** — Backup + restore drill — **P0** — One verified restore from backup or managed snapshot. *(Ops)* — *2026-11-04: [`deploy/scripts/pg-backup.example.sh`](../deploy/scripts/pg-backup.example.sh) + runbook §P0-D3 restore steps — **Ops runbook ready — execute on host**.*
- [x] **P0-D4** — `DATABASE_URL` correctness — **P0** — URL matches actual host/port for each environment. *(Ops)* — *2026-11-04: runbook §P0-D4 — **Ops runbook ready — execute on host**.*
- [x] **P0-SEC5** — Razorpay webhook secret on prod — **P0** — `RAZORPAY_WEBHOOK_SECRET` set; signed webhooks accepted. *(Dev/Ops)* — *2026-11-04: runbook §P0-SEC5 — **Ops runbook ready — execute on host**.*

### Payments, files, monitoring, release

- [x] **P0-PAY1** — Live Razorpay keys on prod — **P0** — `rzp_live_…` configured when `GARUD_DEPLOY_ENV=production`. *(Biz/Ops)* — *2026-11-04: runbook §P0-PAY1 — **Ops runbook ready — execute on host**.*
- [x] **P0-PAY2** — Webhook URL on prod domain — **P0** — e.g. `/platform-api/v1/payments/webhook` registered in Razorpay dashboard. *(Biz/Ops)* — *2026-11-04: runbook §P0-PAY2 — **Ops runbook ready — execute on host**.*
- [ ] **P0-PAY3** — Staging checkout smoke — **P0** — Test-key checkout on `dev.garudhub.me` passes before go-live. *(QA)* — *Checklist: [STAGING_SMOKE_CHECKLIST.md](./STAGING_SMOKE_CHECKLIST.md); execute on staging host.*
- [ ] **P0-PAY4** — Webhook go-live checklist — **P0** — Signature, replay, failed payment, refund per [`PAYMENTS_RUNBOOK.md`](./PAYMENTS_RUNBOOK.md) §3. *(QA/Ops)* — *Execute on staging/prod after PAY2.*
- [x] **P0-PAY5** — Staging deploy env — **P0** — Dev host uses `GARUD_DEPLOY_ENV=staging` (not `production`) with test keys. *(Ops)* — *2026-11-04: runbook §P0-PAY5 — **Ops runbook ready — execute on host**.*
- [x] **P0-F1** — Persistent `UPLOAD_DIR` — **P0** — Partner docs and listing media on a volume that survives redeploy. *(Ops)* — *2026-11-04: runbook §P0-F1 — **Ops runbook ready — execute on host**.*
- [x] **P0-F2** — Upload backup policy — **P0** — Volume backup documented or re-upload risk accepted for MVP. *(Ops)* — *2026-11-04: runbook §P0-F2 — **Ops runbook ready — execute on host**.*
- [x] **P0-M1** — Post-deploy health check — **P0** — Public/staging via tunnel: `GET https://dev.garudhub.me/platform-api/v1/health` (prod: `garudhub.me`); direct backend: `GET http://127.0.0.1:3000/api/v1/health`. *(QA/Ops)* — *2026-11-04: [`deploy/scripts/post-deploy-health-check.sh`](../deploy/scripts/post-deploy-health-check.sh) (defaults to `/platform-api/v1/health` on `BASE_URL`).*
- [x] **P0-M2** — Log retention + 5xx visibility — **P0** — pm2/systemd logs kept; Cloudflare analytics reviewed. *(Ops)* — *2026-11-04: runbook §P0-M2 — **Ops runbook ready — execute on host**.*
- [x] **P0-G1** — Branch policy — **P0** — `dev` = staging, `main` = production enforced in practice. *(Dev)* — *2026-11-04: documented in runbook §P0-G1 + RELEASE.md.*
- [x] **P0-G2** — PRs → `dev`, CI green — **P0** — [`.github/workflows/dev-ci.yml`](../.github/workflows/dev-ci.yml) passing before merge. *(Dev)* — *2026-11-04: added [`main-ci.yml`](../.github/workflows/main-ci.yml) for `main` (P1-6).*
- [x] **P0-G3** — Prod deploy from `main` only — **P0** — Production uses [`remote-deploy-prod.sh`](../deploy/scripts/remote-deploy-prod.sh). *(Ops)* — *2026-11-04: runbook §P0-G3 — **Ops runbook ready — execute on host**.*
- [x] **P0-G4** — Release tags / changelog — **P0** — Tagged release or changelog entry for rollback reference. *(Dev)* — *2026-11-04: [`deploy/RELEASE.md`](../deploy/RELEASE.md) template.*

### Launch sequence (cross-cutting)

- [x] **NEXT-L1** — Production env bundle — **P0** — SMTP, `ADMIN_NOTIFY_EMAIL`, CRM webhook (if used), and payment vars documented on host. *(Dev/Ops)* — *2026-11-04: runbook §NEXT-L1 + `.env.example` files.*
- [ ] **NEXT-L2** — Staging full smoke — **P0** — [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) smoke scripts on `dev.garudhub.me` (checkout, enquiry, 429 sanity). *(QA)* — *Repo checklist: [`STAGING_SMOKE_CHECKLIST.md`](./STAGING_SMOKE_CHECKLIST.md); execution still QA.*
- [x] **NEXT-L3** — Merge `dev` → `main` + prod deploy — **P0** — Production deployed from `main` after staging sign-off. *(Dev/Ops)* — *2026-11-04: runbook §NEXT-L3 commands — **Ops runbook ready — execute on host** after L2 sign-off.*
- [ ] **NEXT-L4** — Production smoke — **P0** — Small live payment + webhook receipt verified on `garudhub.me`. *(QA/Biz)* — *After L3.*
- [x] **NEXT-L5** — Support runbook — **P0** — Ops can grep logs by `x-request-id` for incident triage. *(Ops)* — *2026-11-04: runbook §NEXT-L5 — **Ops runbook ready — execute on host**.*

**Launch week:** Avoid large feature diffs; hotfix via `dev` → cherry-pick if needed ([audit Section F](./FINAL_PRD_AUDIT_DETAILED.md#section-f--recommended-30--60--90-day-roadmap)).

---

## Sprint Hardening (P1 — first ~30 days after launch)

Security, observability, and platform hygiene. Owner: **Dev** unless noted **Ops**. Phased backlog: [SECURITY_IMPROVEMENT_PLAN.md](./SECURITY_IMPROVEMENT_PLAN.md).

- [x] **P1-1** — httpOnly session cookies — **P1** — Replace localStorage JWT; document break-glass for future mobile clients. *(Dev)* — *2026-11-04: cookie auth + proxy; [AUTH_HTTPONLY.md](./AUTH_HTTPONLY.md); `AUTH_SESSION_MODE` / `NEXT_PUBLIC_AUTH_SESSION`.*
- [x] **P1-2** — Helmet + Cloudflare WAF — **P1** — Security headers and edge rules on public hostnames. *(Dev/Ops)* — *2026-11-04: Helmet on Nest API; Cloudflare WAF still Ops.*
- [x] **P1-3** — Dedicated API host + CORS — **P1** — Only if exposing `api.garudhub.me` to non-browser clients. *(Dev)* — *2026-11-04: deferred until needed; runbook P1 table — no code change required for same-origin proxy.*
- [x] **P1-4** — S3/R2 uploads — **P1** — Private object storage with signed URLs replaces sole reliance on local disk. *(Dev/Ops)* — *2026-11-04: `UPLOAD_STORAGE=s3|r2` → `S3UploadStorage`; partner + admin KYC download routes 302 to presigned GET when on S3; gov bid vault uses same `UploadStorageModule`; see [S3_UPLOAD_STORAGE.md](./S3_UPLOAD_STORAGE.md).*
- [ ] **P1-5** — Managed Postgres + automated backups — **P1** — Neon/RDS/DO or equivalent with scheduled snapshots. *(Ops)* — *2026-11-04: runbook P1-5 row — **Ops runbook ready — execute on host**.*
- [x] **P1-6** — `main` branch CI + deploy workflow — **P1** — Mirror `dev-ci` for production branch. *(Dev)* — *2026-11-04: [`.github/workflows/main-ci.yml`](../.github/workflows/main-ci.yml).*
- [x] **P1-7** — Error tracking + uptime — **P1** — Sentry (or equivalent) + external ping on `/health`. *(Dev/Ops)* — *2026-11-04: `SENTRY_DSN` init in Nest `main.ts`; external uptime ping — **Ops runbook ready — execute on host**.*
- [ ] **P1-8** — Partner subscriptions live proof — **P1** — Runbook §4–5: live Razorpay Subscriptions, plan sync, one paid upgrade in prod. *(Dev/Biz)* — *Execute per [PAYMENTS_RUNBOOK.md](./PAYMENTS_RUNBOOK.md) on prod.*
- [x] **NEXT-H1** — Throttle tuning from telemetry — **P1** — Adjust `THROTTLE_*` from real 429 data ([PRODUCTION_READINESS](./PRODUCTION_READINESS.md#rate-limits--abuse-review-p0-sec2-tuning)). *(Dev)* — *2026-11-04: procedure in deploy runbook P1 table; tune after L2 smoke.*
- [x] **NEXT-H2** — SMTP production monitoring — **P1** — Bounce/failure handling for enquiry and KYC mail. *(Ops)* — *2026-11-04: runbook P1-2 row — **Ops runbook ready — execute on host**.*
---

## Sprint UX / Brand (~days 31–60)

Wireframe fidelity and marketing unity without blocking MVP commerce.

- [x] **NEXT-U1** — Snapshot migration batch 2 — **P1** — Bridge or React-ify next 5–10 high-traffic slugs (e.g. government-projects, scrap-recycling, industries-we-serve). *(Dev)* — *2026-11-04: batches 2–3 done; **batch 4 +8** (`enquiry.php`, `loan-calculators.php`, `about.php`, `/blog`→`/blogging`, `/legal/{privacy,terms,tos,refund}`→`legal.php/*`). **Still HTML snapshot (no bridge):** `/blogging` landing, 12 post + 11 category blog slugs, `legal.php/*` canonical pages. All 19 marketing `.html` slugs from `content/raw/` are bridged to React or anchors.*
- [x] **NEXT-U2** — Mobile notification bell — **P1** — In-app bell + unread badge in mobile drawer (desktop bell exists). *(Dev)* — *2026-11-04: `MarketingHeader` mobile drawer.*
- [x] **NEXT-U3** — Buyer in-app notifications — **P1** — Events for quote received, order status (partner bell events exist). *(Dev)* — *2026-11-04: RFQ quote + order fulfillment bell events.*
- [x] **NEXT-U5** — Cinematic home hero — **P2** — Premium aviation photography on `/` per spec §5. *(Design/Dev)* — *2026-11-04: `platform-b2b-hero--cinematic` CSS (Unsplash aviation bg).*
- [x] **NEXT-U6** — Ecosystem flow graphic — **P2** — Designed diagram replacing text-only flow on home. *(Design/Dev)* — *2026-11-04: `platform-home-flow--graphic` styling pass (full designed asset still optional).*
- [x] **NEXT-U7** — Dark technology CTA bands — **P2** — Consistent dark CTA strips across key marketing pages. *(Design/Dev)* — *2026-11-04: `platform-cta-dark-band` on home final CTA; reuse on other pages as needed.*
---

## Sprint Product depth (post-MVP)

Revenue, trust, and spec depth after launch gate. Ordered by typical dependency.

- [x] **NEXT-P2** — Marketplace featured flag — **P2** — Admin toggle + `featuredPlacement` drives featured row (not newest-only). *(Dev)* — *2026-11-04: `featuredOnMarketplace` on listing + admin toggle + featured row (distinct from plan entitlements).*
- [x] **NEXT-P3** — Subscription entitlements in ranking — **P2** — `featuredPlacement` / `rfqPriority` affect marketplace and RFQ visibility. *(Dev)* — *2026-11-04: catalog browse/featured rank + RFQ invite ordering via `PartnerBillingService.getEntitlementsForOrganizations`.*
- [x] **NEXT-P4** — Training lead consolidation — **P2** — Single inbox row for `StudentTrainingLead` + `Lead` per interest. *(Dev)* — *2026-11-04: `enquiryId` on student lead; delete duplicate `Lead` on course interest.*
- [x] **NEXT-P5** — Partnership org picker — **P2** — Search/select counterparty org instead of raw organization ID. *(Dev)* — *2026-11-04: `GET /partner/partnerships/targets` + combobox UI.*
- [x] **NEXT-P6** — Partnership decision notifications — **P2** — Email/in-app when admin approves or declines. *(Dev)* — *2026-11-04: `notifyPartnershipDecision` on admin decide.*
- [x] **NEXT-P7** — Tender bid submission vault — **P2** — Document upload + sealed bid flow for `GovOpportunity` (beyond express interest). *(Dev)* — *2026-11-04: bid vault + admin document download after unseal; gov bid uploads/read via `UploadStorageModule` (S3 when configured).*
- [x] **NEXT-P8** — Analytics dedupe + CSV export — **P2** — Bot/owner dedupe on listing views; partner export. *(Dev)* — *2026-11-04: 24h dedupe + CSV export; partner self-views skipped; empty / known crawler user agents skip PDP view recording.*
---

## Sprint Business (optional)

Requires product/legal decisions; not launch blockers.

- [ ] **NEXT-B1** — COD payment decision — **P2** — Biz picks **Approve full COD / Defer (hide) / Limited pilot** — options in [`COD_DECISION.md`](./COD_DECISION.md#next-b1--three-options-for-biz); context in [PRD Phase 4](./PRD_REMAINING_TASKS.md#phase-4--marketplace-prd-gaps). *(Biz)* — **Blocked on business decision.**
- [ ] **NEXT-B2** — COD implementation — **P2** — If B1 approves (A or C): finish **admin COD reconciliation**, ops runbook, tests/smoke, and policy hooks — partial flow already behind `COD_ENABLED` (see [`COD_DECISION.md`](./COD_DECISION.md#what-already-exists-feature-flagged)). *(Dev)* — **Blocked on [NEXT-B1](#sprint-business-optional).**
- [x] **NEXT-B3** — GST invoices / billing history — **P2** — Partner subscription and order invoices for Indian B2B compliance. *(Dev/Biz)* — *2026-11-04: HTML receipt stubs — `GET /buyer/orders/:id/receipt.html` (paid), `GET /partner/subscription/receipt.html` (active paid plan); UI links on order + subscription pages; **not** statutory GST / e-invoice — Biz + formal compliance still backlog.*

---

## Explicit deferrals (no checkbox until reprioritized)

Multi-vendor cart, DGCA portal integration, finance lender APIs, repair pickup scheduling, scrap valuation engine — see [audit Section F deferrals](./FINAL_PRD_AUDIT_DETAILED.md#section-f--recommended-30--60--90-day-roadmap).

---

## Task count summary

| Sprint | Open tasks (this doc) |
|--------|------------------------|
| Launch (Phase 0 + sequence) | 4 (QA/live proof only) |
| Hardening (P1) | 2 |
| UX / Brand | 0 |
| Product depth | 0 |
| Business (optional) | 2 |
| **Total open checkboxes** | **8** |

*httpOnly auth: **P1-1** done. Partnership picker + notifications: **NEXT-P5/P6** done. Launch gate = execute runbook on host + QA smokes.*

---

*Maintained alongside [PRD_REMAINING_TASKS.md](./PRD_REMAINING_TASKS.md). Re-baseline after Phase 0 host execution or after `main` production launch.*
