# GarudHub — NEXT task list

**Date:** 4 November 2026  
**Code baseline:** `dev` @ **`e1c75af`**  
**Purpose:** Ordered “what to do next” for launch and the following sprints — not a full PRD ledger.

**Source of truth (detail):**

- [FINAL_PRD_AUDIT_DETAILED.md](./FINAL_PRD_AUDIT_DETAILED.md) — completion scores, journeys, Section F roadmap  
- [PRD_REMAINING_TASKS.md](./PRD_REMAINING_TASKS.md) — Phase 0 / P1 checkboxes and phase history  
- [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) — P0/P1 ops tables and smoke procedures  

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
| **Full ecosystem PRD** (marketplace, partner dashboard, verticals, admin) | **~78–82%** | Polish + depth sprints below |
| **Narrow MVP** (marketplace + KYC + RFQ + cart/checkout + admin trust) | **~88–92%** | Staging smoke, then `dev` → `main` |
| **Production go-live readiness** (hosting, secrets, payments proof) | **~35–40%** | **Sprint Launch — all P0** |

**Leadership line:** The product is **demo- and staging-ready**; **garudhub.me public traffic waits on Phase 0**, not on building another core module.

---

## Sprint Launch (Phase 0) — production gate

Complete before treating production as live. Owner hints: **Ops** = infra/DNS/host, **Dev** = app/env/CI, **Biz** = Razorpay account, **QA** = smoke scripts.

### Hosting & process

- [ ] **P0-H1** — Always-on VPS or cloud host — **P0** — App reachable 24/7 without a Mac or manual tunnel. *(Ops)*
- [ ] **P0-H2** — Process supervisor for API + web — **P0** — `garudhub-api` and `garudhub-web` restart on crash and after reboot. *(Ops)*
- [ ] **P0-H3** — `cloudflared` as system service — **P0** — Tunnel survives logout/reboot (not a Terminal session). *(Ops)*
- [ ] **P0-H4** — Staging tunnel — **P0** — `dev.garudhub.me` → Next `:3001` on the staging host. *(Ops)*
- [ ] **P0-H5** — Production tunnel — **P0** — `garudhub.me` → Next `:3001` (optional API ingress for webhooks). *(Ops)*

### Secrets, database, security (host)

- [ ] **P0-S1** — Production JWT secrets — **P0** — ≥32-char random access/refresh secrets set on prod; API boots clean. *(Ops/Dev)*
- [ ] **P0-S2** — No demo seed on prod — **P0** — `prisma:seed` not run on production unless explicit override. *(Ops)*
- [ ] **P0-S3** — Host-only `.env` — **P0** — Secrets only on server; rotate if ever committed. *(Ops)*
- [x] **P0-S4** — Frontend production env — **P0** — `NEXT_PUBLIC_*` and `BACKEND_URL` match [`frontend/.env.example`](../frontend/.env.example). *(Dev)* — *2026-11-04: expanded checklist + links to smoke, health, backup, RELEASE.*
- [ ] **P0-S5** — `GARUD_DEPLOY_ENV=production` on prod — **P0** — Live Razorpay validation enabled on production host. *(Ops)*
- [ ] **P0-D1** — Persistent Postgres volume — **P0** — Data survives container/host redeploy. *(Ops)*
- [ ] **P0-D2** — `prisma migrate deploy` every deploy — **P0** — Staging and prod deploy scripts apply all migrations. *(Dev/Ops)*
- [ ] **P0-D3** — Backup + restore drill — **P0** — One verified restore from backup or managed snapshot. *(Ops)* — *Repo: [`deploy/scripts/pg-backup.example.sh`](../deploy/scripts/pg-backup.example.sh); restore drill still Ops.*
- [ ] **P0-D4** — `DATABASE_URL` correctness — **P0** — URL matches actual host/port for each environment. *(Ops)*
- [ ] **P0-SEC5** — Razorpay webhook secret on prod — **P0** — `RAZORPAY_WEBHOOK_SECRET` set; signed webhooks accepted. *(Dev/Ops)*

### Payments, files, monitoring, release

- [ ] **P0-PAY1** — Live Razorpay keys on prod — **P0** — `rzp_live_…` configured when `GARUD_DEPLOY_ENV=production`. *(Biz/Ops)*
- [ ] **P0-PAY2** — Webhook URL on prod domain — **P0** — e.g. `/platform-api/v1/payments/webhook` registered in Razorpay dashboard. *(Biz/Ops)*
- [ ] **P0-PAY3** — Staging checkout smoke — **P0** — Test-key checkout on `dev.garudhub.me` passes before go-live. *(QA)*
- [ ] **P0-PAY4** — Webhook go-live checklist — **P0** — Signature, replay, failed payment, refund per [`PAYMENTS_RUNBOOK.md`](./PAYMENTS_RUNBOOK.md) §3. *(QA/Ops)*
- [ ] **P0-PAY5** — Staging deploy env — **P0** — Dev host uses `GARUD_DEPLOY_ENV=staging` (not `production`) with test keys. *(Ops)*
- [ ] **P0-F1** — Persistent `UPLOAD_DIR` — **P0** — Partner docs and listing media on a volume that survives redeploy. *(Ops)*
- [ ] **P0-F2** — Upload backup policy — **P0** — Volume backup documented or re-upload risk accepted for MVP. *(Ops)*
- [x] **P0-M1** — Post-deploy health check — **P0** — `GET /api/v1/health` green after each deploy. *(QA/Ops)* — *2026-11-04: [`deploy/scripts/post-deploy-health-check.sh`](../deploy/scripts/post-deploy-health-check.sh).*
- [ ] **P0-M2** — Log retention + 5xx visibility — **P0** — pm2/systemd logs kept; Cloudflare analytics reviewed. *(Ops)*
- [ ] **P0-G1** — Branch policy — **P0** — `dev` = staging, `main` = production enforced in practice. *(Dev)*
- [x] **P0-G2** — PRs → `dev`, CI green — **P0** — [`.github/workflows/dev-ci.yml`](../.github/workflows/dev-ci.yml) passing before merge. *(Dev)* — *2026-11-04: added [`main-ci.yml`](../.github/workflows/main-ci.yml) for `main` (P1-6).*
- [ ] **P0-G3** — Prod deploy from `main` only — **P0** — Production uses [`remote-deploy-prod.sh`](../deploy/scripts/remote-deploy-prod.sh). *(Ops)*
- [x] **P0-G4** — Release tags / changelog — **P0** — Tagged release or changelog entry for rollback reference. *(Dev)* — *2026-11-04: [`deploy/RELEASE.md`](../deploy/RELEASE.md) template.*

### Launch sequence (cross-cutting)

- [ ] **NEXT-L1** — Production env bundle — **P0** — SMTP, `ADMIN_NOTIFY_EMAIL`, CRM webhook (if used), and payment vars documented on host. *(Dev/Ops)*
- [ ] **NEXT-L2** — Staging full smoke — **P0** — [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) smoke scripts on `dev.garudhub.me` (checkout, enquiry, 429 sanity). *(QA)* — *Repo checklist: [`STAGING_SMOKE_CHECKLIST.md`](./STAGING_SMOKE_CHECKLIST.md); execution still QA.*
- [ ] **NEXT-L3** — Merge `dev` → `main` + prod deploy — **P0** — Production deployed from `main` after staging sign-off. *(Dev/Ops)*
- [ ] **NEXT-L4** — Production smoke — **P0** — Small live payment + webhook receipt verified on `garudhub.me`. *(QA/Biz)*
- [ ] **NEXT-L5** — Support runbook — **P0** — Ops can grep logs by `x-request-id` for incident triage. *(Ops)*

**Launch week:** Avoid large feature diffs; hotfix via `dev` → cherry-pick if needed ([audit Section F](./FINAL_PRD_AUDIT_DETAILED.md#section-f--recommended-30--60--90-day-roadmap)).

---

## Sprint Hardening (P1 — first ~30 days after launch)

Security, observability, and platform hygiene. Owner: **Dev** unless noted **Ops**.

- [ ] **P1-1** — httpOnly session cookies — **P1** — Replace localStorage JWT; document break-glass for future mobile clients. *(Dev)*
- [x] **P1-2** — Helmet + Cloudflare WAF — **P1** — Security headers and edge rules on public hostnames. *(Dev/Ops)* — *2026-11-04: Helmet on Nest API; Cloudflare WAF still Ops.*
- [ ] **P1-3** — Dedicated API host + CORS — **P1** — Only if exposing `api.garudhub.me` to non-browser clients. *(Dev)*
- [ ] **P1-4** — S3/R2 uploads — **P1** — Private object storage with signed URLs replaces sole reliance on local disk. *(Dev/Ops)*
- [ ] **P1-5** — Managed Postgres + automated backups — **P1** — Neon/RDS/DO or equivalent with scheduled snapshots. *(Ops)*
- [x] **P1-6** — `main` branch CI + deploy workflow — **P1** — Mirror `dev-ci` for production branch. *(Dev)* — *2026-11-04: [`.github/workflows/main-ci.yml`](../.github/workflows/main-ci.yml).*
- [ ] **P1-7** — Error tracking + uptime — **P1** — Sentry (or equivalent) + external ping on `/health`. *(Dev/Ops)*
- [ ] **P1-8** — Partner subscriptions live proof — **P1** — Runbook §4–5: live Razorpay Subscriptions, plan sync, one paid upgrade in prod. *(Dev/Biz)*
- [ ] **NEXT-H1** — Throttle tuning from telemetry — **P1** — Adjust `THROTTLE_*` from real 429 data ([PRODUCTION_READINESS](./PRODUCTION_READINESS.md#rate-limits--abuse-review-p0-sec2-tuning)). *(Dev)*
- [ ] **NEXT-H2** — SMTP production monitoring — **P1** — Bounce/failure handling for enquiry and KYC mail. *(Ops)*
---

## Sprint UX / Brand (~days 31–60)

Wireframe fidelity and marketing unity without blocking MVP commerce.

- [x] **NEXT-U1** — Snapshot migration batch 2 — **P1** — Bridge or React-ify next 5–10 high-traffic slugs (e.g. government-projects, scrap-recycling, industries-we-serve). *(Dev)* — *2026-11-04: +5 redirects in `snapshot-bridge.ts`.*
- [x] **NEXT-U2** — Mobile notification bell — **P1** — In-app bell + unread badge in mobile drawer (desktop bell exists). *(Dev)* — *2026-11-04: `MarketingHeader` mobile drawer.*
- [x] **NEXT-U3** — Buyer in-app notifications — **P1** — Events for quote received, order status (partner bell events exist). *(Dev)* — *2026-11-04: RFQ quote + order fulfillment bell events.*
- [ ] **NEXT-U5** — Cinematic home hero — **P2** — Premium aviation photography on `/` per spec §5. *(Design/Dev)*
- [ ] **NEXT-U6** — Ecosystem flow graphic — **P2** — Designed diagram replacing text-only flow on home. *(Design/Dev)*
- [ ] **NEXT-U7** — Dark technology CTA bands — **P2** — Consistent dark CTA strips across key marketing pages. *(Design/Dev)*
---

## Sprint Product depth (post-MVP)

Revenue, trust, and spec depth after launch gate. Ordered by typical dependency.

- [x] **NEXT-P2** — Marketplace featured flag — **P2** — Admin toggle + `featuredPlacement` drives featured row (not newest-only). *(Dev)* — *2026-11-04: `featuredOnMarketplace` on listing + admin toggle + featured row (distinct from plan entitlements).*
- [ ] **NEXT-P3** — Subscription entitlements in ranking — **P2** — `featuredPlacement` / `rfqPriority` affect marketplace and RFQ visibility. *(Dev)*
- [ ] **NEXT-P4** — Training lead consolidation — **P2** — Single inbox row for `StudentTrainingLead` + `Lead` per interest. *(Dev)*
- [ ] **NEXT-P5** — Partnership org picker — **P2** — Search/select counterparty org instead of raw organization ID. *(Dev)*
- [ ] **NEXT-P6** — Partnership decision notifications — **P2** — Email/in-app when admin approves or declines. *(Dev)*
- [ ] **NEXT-P7** — Tender bid submission vault — **P2** — Document upload + sealed bid flow for `GovOpportunity` (beyond express interest). *(Dev)*
- [ ] **NEXT-P8** — Analytics dedupe + CSV export — **P2** — Bot/owner dedupe on listing views; partner export. *(Dev)*
---

## Sprint Business (optional)

Requires product/legal decisions; not launch blockers.

- [ ] **NEXT-B1** — COD payment decision — **P2** — Biz chooses whether to wire `CASH_ON_DELIVERY` end-to-end ([PRD Phase 4 deferral](./PRD_REMAINING_TASKS.md#phase-4--marketplace-prd-gaps)). *(Biz)*
- [ ] **NEXT-B2** — COD implementation — **P2** — If approved: checkout, order state, and admin reconciliation for COD. *(Dev)*
- [ ] **NEXT-B3** — GST invoices / billing history — **P2** — Partner subscription and order invoices for Indian B2B compliance. *(Dev/Biz)*

---

## Explicit deferrals (no checkbox until reprioritized)

Multi-vendor cart, DGCA portal integration, finance lender APIs, repair pickup scheduling, scrap valuation engine — see [audit Section F deferrals](./FINAL_PRD_AUDIT_DETAILED.md#section-f--recommended-30--60--90-day-roadmap).

---

## Task count summary

| Sprint | Open tasks (this doc) |
|--------|------------------------|
| Launch (Phase 0 + sequence) | 33 |
| Hardening (P1) | 10 |
| UX / Brand | 6 |
| Product depth | 7 |
| Business (optional) | 3 |
| **Total checkboxes** | **59** |

*httpOnly auth: **P1-1** (Hardening). Partnership picker: **NEXT-P5** (Product depth). Launch + Hardening are the critical path.*

---

*Maintained alongside [PRD_REMAINING_TASKS.md](./PRD_REMAINING_TASKS.md). Re-baseline after Phase 0 items flip to checked or after `main` production launch.*
