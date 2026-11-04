# GarudHub — production readiness checklist

**Stack:** NestJS 11 + Prisma + PostgreSQL, Next.js 15, Cloudflare Tunnel (`cloudflared`), domains **garudhub.me** (prod) / **dev.garudhub.me** (staging), Razorpay, GitHub Actions CI on **`dev`**.

**Goal:** Safe, always-on hosting with secrets, migrations, payments, and smoke-tested releases — without blocking MVP on full spec completion ([`PARTIAL_COMPLETION_BACKLOG.md`](./PARTIAL_COMPLETION_BACKLOG.md)).

| Phase | Meaning | Target |
|-------|---------|--------|
| **P0** | Must fix before public prod traffic | This doc § P0 + implemented code guards |
| **P1** | First month hardening | Security, cookies, observability |
| **P2** | Scale / compliance / spec depth | Backlog items, S3, managed DB |

**Suggested owners:** `Eng` = engineering, `Ops` = infra/DNS/host, `Biz` = Razorpay/legal, `QA` = manual smoke.

---

## P0 — Launch blockers

### Hosting & process management

| # | Task | Owner | Notes |
|---|------|-------|-------|
| P0-H1 | Move off **Mac + manual tunnel** to **VPS or always-on host** (2 vCPU / 4 GB min) | Ops | Same layout: Postgres docker, Nest :3000, Next :3001 |
| P0-H2 | **pm2** or **systemd** for `garudhub-api` + `garudhub-web`; `pm2 save` + boot startup | Ops | Scripts: [`deploy/scripts/remote-deploy-dev.sh`](../deploy/scripts/remote-deploy-dev.sh), [`remote-deploy-prod.sh`](../deploy/scripts/remote-deploy-prod.sh) |
| P0-H3 | **cloudflared** as system service (not a Terminal window) | Ops | Examples: [`deploy/cloudflared/`](../deploy/cloudflared/); runbook [`DEPLOY_CLOUDFLARE_TUNNEL.md`](./DEPLOY_CLOUDFLARE_TUNNEL.md) |
| P0-H4 | Staging tunnel → **dev.garudhub.me** → `http://127.0.0.1:3001` | Ops | CI validates **`dev`** branch only ([`CICD_DEV.md`](./CICD_DEV.md)) |
| P0-H5 | Production tunnel → **garudhub.me** (or **app.garudhub.me**) → Next :3001 | Ops | Optional second ingress for API webhooks → :3000 |

### Secrets & configuration

| # | Task | Owner | Notes |
|---|------|-------|-------|
| P0-S1 | **JWT_ACCESS_SECRET** / **JWT_REFRESH_SECRET**: ≥32 chars, cryptographically random, not `.env.example` values | Eng/Ops | **Enforced at API boot** when `NODE_ENV=production` |
| P0-S2 | **No demo seed on prod** — do not run `prisma:seed` with `DEMO_PASSWORD` / `ADMIN_PASSWORD` | Ops | Seed **refuses** `NODE_ENV=production` unless `ALLOW_DEMO_SEED=true` |
| P0-S3 | Production `.env` on host only — never commit; rotate if leaked | Ops | Backend: [`backend/.env.example`](../backend/.env.example) |
| P0-S4 | Frontend prod env: [`frontend/.env.example`](../frontend/.env.example) checklist (`NEXT_PUBLIC_*`, `BACKEND_URL`) | Eng | No secrets in `NEXT_PUBLIC_*` |
| P0-S5 | Set `GARUD_DEPLOY_ENV=production` on prod host for **live Razorpay** validation | Ops | Staging: `GARUD_DEPLOY_ENV=staging` + test keys OK |

### Database

| # | Task | Owner | Notes |
|---|------|-------|-------|
| P0-D1 | Postgres running with persistent volume | Ops | [`deploy/docker-compose.prod.example.yml`](../deploy/docker-compose.prod.example.yml) |
| P0-D2 | **`npx prisma migrate deploy`** in every deploy (both envs) | Eng/Ops | Already in remote deploy scripts |
| P0-D3 | **Backup**: daily `pg_dump` or managed Postgres snapshots | Ops | P1 to automate; P0 = one verified restore drill |
| P0-D4 | `DATABASE_URL` matches host/port (5434 local docker vs managed URL) | Ops | |

### Security (MVP)

| # | Task | Owner | Status |
|---|------|-------|--------|
| P0-SEC1 | **Swagger off** on prod (`NODE_ENV=production`) | Eng | **Done** — optional `SWAGGER_ENABLED=true` on staging only |
| P0-SEC2 | **Rate limits** on public abuse surfaces | Eng | **Done** — global 120/min; auth 10/min; enquiry 5/min |
| P0-SEC3 | **CORS** | Eng | Same-origin Next proxy — no browser CORS change needed if tunnel hits Next only |
| P0-SEC4 | **Helmet** + explicit CORS for direct API hostname | Eng | **P1** if exposing `api.garudhub.me` |
| P0-SEC5 | Razorpay webhook signature verification | Eng | Verify env `RAZORPAY_WEBHOOK_SECRET` set on prod |

### Payments

> Full procedure, env matrix, webhook checklist and incident levers: **[`PAYMENTS_RUNBOOK.md`](./PAYMENTS_RUNBOOK.md)**.

| # | Task | Owner | Notes |
|---|------|-------|-------|
| P0-PAY1 | Razorpay **live** keys on prod (`rzp_live_…`) | Biz/Ops | Boot check when `GARUD_DEPLOY_ENV=production` |
| P0-PAY2 | Webhook URL on **prod domain** | Biz/Ops | e.g. `https://garudhub.me/platform-api/v1/payments/webhook` or dedicated API host |
| P0-PAY3 | Test checkout on **dev.garudhub.me** with test keys before go-live | QA | |
| P0-PAY4 | Webhook go-live checklist (signature, replay, failed payment, refund) | QA/Ops | [`PAYMENTS_RUNBOOK.md` §3](./PAYMENTS_RUNBOOK.md#3-webhook-configuration) |
| P0-PAY5 | `GARUD_DEPLOY_ENV=staging` on dev host (not `production`) so test keys boot and sandbox stays staging-only | Ops | Sandbox payments are rejected when `production` |

### Files & uploads

| # | Task | Owner | Notes |
|---|------|-------|-------|
| P0-F1 | **Persistent `UPLOAD_DIR`** (partner docs, listing media) | Ops | Default `./uploads` — survives redeploy via volume or P1 S3 |
| P0-F2 | Backup uploads with DB or accept re-upload for MVP | Ops | See backlog **P-BE-07** |

### Monitoring

| # | Task | Owner | Notes |
|---|------|-------|-------|
| P0-M1 | Hit **`GET /api/v1/health`** (or `/platform-api/v1/health` via Next) after deploy | QA/Ops | Returns `{ status: 'ok', service: 'garudhub-api' }` |
| P0-M2 | pm2/systemd logs retained; Cloudflare analytics for 5xx | Ops | P1: structured logging / Sentry |

### Branching & release

| # | Task | Owner | Notes |
|---|------|-------|-------|
| P0-G1 | **`dev`** = staging → **dev.garudhub.me**; **`main`** = production | Eng | Merge **dev → main** after smoke on staging |
| P0-G2 | PRs target `dev`; CI green before merge | Eng | [`.github/workflows/dev-ci.yml`](../.github/workflows/dev-ci.yml) |
| P0-G3 | Production deploy from **`main`** only | Ops | [`remote-deploy-prod.sh`](../deploy/scripts/remote-deploy-prod.sh) |
| P0-G4 | Tag releases / changelog for rollback | Eng | P1 automation optional |

### Spec gaps acceptable for prod MVP

| OK for MVP | Must-fix before prod (P0) |
|------------|---------------------------|
| Partial marketing snapshots, partner module roadmap labels | Weak JWT, open Swagger on prod, no backups plan |
| Marketplace search v1 / pagination (shipped) | Mac-only tunnel, no process supervisor |
| JWT in **localStorage** ([**P-BE-06**](./PARTIAL_COMPLETION_BACKLOG.md)) | **P1** httpOnly cookies — document risk |
| Local disk uploads | Lost uploads on disk wipe — volume or S3 |
| Admin enquiry queue (native API shipped) | Rate-limited public enquiry + auth |

Full partial inventory: [`PARTIAL_COMPLETION_BACKLOG.md`](./PARTIAL_COMPLETION_BACKLOG.md).

---

## P1 — Hardening (first 30 days)

| # | Area | Task | Owner |
|---|------|------|-------|
| P1-1 | Auth | httpOnly cookies for refresh/access (**P-BE-06**) | Eng |
| P1-2 | Security | `helmet`, tighten headers; WAF rules in Cloudflare | Eng/Ops |
| P1-3 | API | Dedicated **api.garudhub.me** + CORS allowlist if mobile/third-party clients | Eng |
| P1-4 | Files | S3-compatible storage (Cloudflare R2 / AWS) for uploads | Eng/Ops |
| P1-5 | DB | Managed Postgres (Neon, RDS, DO) + automated backups | Ops |
| P1-6 | CI | **`main`** branch CI + deploy workflow (mirror dev-ci) | Eng |
| P1-7 | Observability | Error tracking, uptime check on `/health` | Eng/Ops |
| P1-8 | Payments | Partner subscription billing (**P-BE-02**, **C4**) — **built (v1)**; go-live = runbook §4–5 (sync plans to live Razorpay, enable Subscriptions) | Eng/Biz |

---

## P2 — Scale & product depth

| # | Area | Task | Owner |
|---|------|------|-------|
| P2-1 | Product | Items in Phase C of partial backlog (Leads, Messages, Analytics) | Eng |
| P2-2 | Infra | Dockerize app images; blue/green or second VPS | Ops |
| P2-3 | Compliance | Data retention, privacy policy alignment, audit export | Biz/Eng |
| P2-4 | Performance | CDN for static assets; DB connection pooling review | Eng |

---

## Environment matrix

| Variable | Local | Staging (dev.garudhub.me) | Production (garudhub.me) |
|----------|-------|---------------------------|---------------------------|
| `NODE_ENV` | development | production | production |
| `GARUD_DEPLOY_ENV` | — | staging | production |
| `SWAGGER_ENABLED` | — | true (optional) | **unset / false** |
| Razorpay keys | test | test | **live** |
| Razorpay webhook secret | optional | **required** | **required** |
| Sandbox payment simulation | yes | yes (no keys) | **blocked** |
| `prisma:seed` | yes | once if needed (`ALLOW_DEMO_SEED`) | **no** |
| JWT secrets | example OK | strong unique | strong unique |

---

## Smoke test scripts (manual)

Run after every deploy. Record date + operator.

### Staging — https://dev.garudhub.me

```text
[ ] Home or /marketplace loads (no Cloudflare 502)
[ ] /marketplace?section=drones — listings render
[ ] /platform-api/v1/health or API health via proxy — 200 ok
[ ] Register or login (test user) — JWT returned
[ ] Submit enquiry form — 201, admin list shows row (if admin access)
[ ] Partner login — catalog list loads
[ ] Buyer checkout test payment (Razorpay test mode) — order status updates
[ ] Swagger (if SWAGGER_ENABLED=true): /api/docs NOT required on staging browser path unless API exposed
[ ] Rate limit sanity: rapid enquiry spam returns 429 (optional)
```

### Production — https://garudhub.me (or app.garudhub.me)

```text
[ ] Marketplace public browse — no auth required
[ ] Login / register — production IdP not demo accounts
[ ] Enquiry submit — success message, no stack trace
[ ] /api/docs — 404 or Cloudflare block (Swagger disabled)
[ ] Razorpay live checkout — small real transaction + webhook received
[ ] Upload partner document (if onboarding live) — file persists after pm2 restart
[ ] SSL valid; Cloudflare proxy orange-cloud as intended
[ ] pm2 list — garudhub-api + garudhub-web online
[ ] docker ps — postgres healthy
```

### CLI quick checks (on server)

```bash
curl -sS http://127.0.0.1:3000/api/v1/health
curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/marketplace
```

---

## Code vs ops split (this pass)

| Implemented in repo (P0 code) | Ops / dashboard (you) |
|------------------------------|------------------------|
| Env validation (JWT strength, optional live Razorpay) | VPS, pm2/systemd, cloudflared service |
| Swagger disabled in production | Namecheap/Cloudflare DNS to tunnel |
| Rate limits auth + enquiry | Strong `.env` on server |
| Seed blocked in production | Razorpay live keys + webhook URL |
| Deploy scripts + this checklist | Backups, `GARUD_DEPLOY_ENV`, merge dev→main |

---

## Related docs

- [`DEPLOY_CLOUDFLARE_TUNNEL.md`](./DEPLOY_CLOUDFLARE_TUNNEL.md) — tunnel topology
- [`CICD_DEV.md`](./CICD_DEV.md) — dev branch CI/CD
- [`PARTIAL_COMPLETION_BACKLOG.md`](./PARTIAL_COMPLETION_BACKLOG.md) — product gaps vs MVP prod

*Last updated: production readiness pass (Nest env validation, throttling, Swagger guard, seed guard).*
