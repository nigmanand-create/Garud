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
| P0-S4 | Frontend prod env: [`frontend/.env.example`](../frontend/.env.example) checklist (`NEXT_PUBLIC_*`, `BACKEND_URL`) | Eng | No secrets in `NEXT_PUBLIC_*`; cross-links to smoke + backup scripts in that file |
| P0-S5 | Set `GARUD_DEPLOY_ENV=production` on prod host for **live Razorpay** validation | Ops | Staging: `GARUD_DEPLOY_ENV=staging` + test keys OK |

### Database

| # | Task | Owner | Notes |
|---|------|-------|-------|
| P0-D1 | Postgres running with persistent volume | Ops | [`deploy/docker-compose.prod.example.yml`](../deploy/docker-compose.prod.example.yml) |
| P0-D2 | **`npx prisma migrate deploy`** in every deploy (both envs) | Eng/Ops | Already in remote deploy scripts |
| P0-D3 | **Backup**: daily `pg_dump` or managed Postgres snapshots | Ops | Template: [`deploy/scripts/pg-backup.example.sh`](../deploy/scripts/pg-backup.example.sh); P0 = one verified restore drill |
| P0-D4 | `DATABASE_URL` matches host/port (5434 local docker vs managed URL) | Ops | |

### Security (MVP)

| # | Task | Owner | Status |
|---|------|-------|--------|
| P0-SEC1 | **Swagger off** on prod (`NODE_ENV=production`) | Eng | **Done** — optional `SWAGGER_ENABLED=true` on staging only |
| P0-SEC2 | **Rate limits** on public abuse surfaces | Eng | **Done** — global 120/min; auth 10/min; enquiry 5/min; now env-tunable ([notes](#rate-limits--abuse-review-p0-sec2-tuning)) |
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
| P0-M1 | Hit **`GET /api/v1/health`** (or `/platform-api/v1/health` via Next) after deploy | QA/Ops | Returns `{ status: 'ok', service: 'garudhub-api' }`; script: [`deploy/scripts/post-deploy-health-check.sh`](../deploy/scripts/post-deploy-health-check.sh) |
| P0-M2 | pm2/systemd logs retained; Cloudflare analytics for 5xx | Ops | **Structured JSON logs + `x-request-id` shipped** ([Phase 7 notes](#integrations--nfr-notes-phase-7)); P1: Sentry |

### Branching & release

| # | Task | Owner | Notes |
|---|------|-------|-------|
| P0-G1 | **`dev`** = staging → **dev.garudhub.me**; **`main`** = production | Eng | Merge **dev → main** after smoke on staging |
| P0-G2 | PRs target `dev`; CI green before merge | Eng | [`.github/workflows/dev-ci.yml`](../.github/workflows/dev-ci.yml); **`main`**: [`.github/workflows/main-ci.yml`](../.github/workflows/main-ci.yml) |
| P0-G3 | Production deploy from **`main`** only | Ops | [`remote-deploy-prod.sh`](../deploy/scripts/remote-deploy-prod.sh) |
| P0-G4 | Tag releases / changelog for rollback | Eng | [`deploy/RELEASE.md`](../deploy/RELEASE.md) template |

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
| P1-2 | Security | `helmet`, tighten headers; WAF rules in Cloudflare | Eng/Ops — **Helmet on API** shipped in `backend/src/main.ts`; Cloudflare WAF remains Ops |
| P1-3 | API | Dedicated **api.garudhub.me** + CORS allowlist if mobile/third-party clients | Eng |
| P1-4 | Files | S3-compatible storage (Cloudflare R2 / AWS) for uploads | Eng/Ops |
| P1-5 | DB | Managed Postgres (Neon, RDS, DO) + automated backups | Ops |
| P1-6 | CI | **`main`** branch CI + deploy workflow (mirror dev-ci) | Eng — **Done:** [`.github/workflows/main-ci.yml`](../.github/workflows/main-ci.yml) |
| P1-7 | Observability | Error tracking, uptime check on `/health` | Eng/Ops |
| P1-8 | Payments | Partner subscription billing (**P-BE-02**, **C4**) — **built (v1)**; go-live = runbook §4–5 (sync plans to live Razorpay, enable Subscriptions) | Eng/Biz |

---

## P2 — Scale & product depth

| # | Area | Task | Owner |
|---|------|------|-------|
| P2-1 | Product | Items in Phase C of partial backlog (Leads, Messages, Analytics) | Eng |
| P2-2 | Infra | Dockerize app images; blue/green or second VPS | Ops |
| P2-3 | Compliance | Data retention, privacy policy alignment, audit export | Biz/Eng — **policy stub written** ([notes](#data-retention--privacy-stub--p2-3)); purge jobs + published policy pending |
| P2-4 | Performance | CDN for static assets; DB connection pooling review | Eng — **documented** ([CDN](#cdn-for-static--snapshot-assets-p2-4), [pooling](#database-connection-pooling-p2-4)); no load test yet |

---

## Integrations & NFR notes (Phase 7)

### Structured logging & request IDs (P0-M2 extension)

- Every API request gets a correlation id: an inbound `x-request-id` is reused when well-formed (8–128 chars of `A-Za-z0-9._-`, e.g. sent by Cloudflare/Next), otherwise a UUID is minted. It is echoed on the response header and stamped on **every** log line for that request (AsyncLocalStorage), including the outbound CRM webhook (`X-Request-Id`).
- One access-log line per request (`METHOD /path status ms user=<id>`); query strings are deliberately omitted (tokens/PII). Successful `/health` hits are not logged.
- Format: `LOG_FORMAT=json|pretty` (default **json** when `NODE_ENV=production`, **pretty** otherwise); level: `LOG_LEVEL=fatal|error|warn|log|debug|verbose` (default `log` in prod, `debug` in dev). JSON line: `{"time","level","context","requestId","message","stack?"}` — ship stdout/stderr from pm2/journald to any log aggregator.
- Support workflow: ask the user for the `x-request-id` response header (or the failing time), then `pm2 logs garudhub-api --lines 2000 | grep <id>`.
- Not done: error tracker (Sentry) and metrics — still P1-7.

### Rate limits & abuse review (P0-SEC2 tuning)

All limits are **per client IP, per window**, and now env-tunable (no redeploy of code — change `.env` + restart). Defaults equal the original hard-coded values.

| Bucket | Applies to | Env (limit / window ms) | Default |
|--------|-----------|--------------------------|---------|
| `global` | every route without an override | `THROTTLE_GLOBAL_LIMIT` / `THROTTLE_GLOBAL_TTL_MS` | 120 / 60 000 |
| `auth` | `POST /auth/register`, `/auth/login`, `/auth/change-password` | `THROTTLE_AUTH_LIMIT` / `THROTTLE_AUTH_TTL_MS` | 10 / 60 000 |
| `authRefresh` | `POST /auth/refresh` (silent SPA refresh) | `THROTTLE_AUTH_REFRESH_LIMIT` / `…_TTL_MS` | 30 / 60 000 |
| `enquiry` | public `POST /enquiries` | `THROTTLE_ENQUIRY_LIMIT` / `THROTTLE_ENQUIRY_TTL_MS` | 5 / 60 000 |

Tuning guidance after launch:

1. **Watch 429s** (access log `… 429 …`; Cloudflare analytics). A burst of 429s from a single IP on `/auth/login` is brute force — keep `auth` low (10/min) and consider Cloudflare WAF rate rules on `/platform-api/v1/auth/*` (cheaper than hitting Node).
2. **Shared IPs (offices, mobile carriers, government networks)** can legitimately exceed 5 enquiries/min only if many people submit at once — raise `THROTTLE_ENQUIRY_LIMIT` to 10–20 before loosening anything else. Public catalog GETs fall under `global` (120/min); raise to 300 if marketplace browsing is legitimately heavier.
3. **Client IP is now forwarded by the Next proxy** (`cf-connecting-ip` → `x-forwarded-for`). Before this, Nest saw only the Next server's IP, so all visitors shared one bucket. This is only safe while the origin is reachable **only** through Cloudflare/Next (tunnel); if you expose the API hostname directly, keep `trust proxy` and Cloudflare in front.
4. **Counters are in-memory per process.** With pm2 `-i N` cluster mode the effective limit is ~N× the configured value and resets on restart. Fine for the single-process MVP; move to a shared store (`@nest-lab/throttler-storage-redis`) before running multiple instances.
5. Authenticated admin/partner APIs have no separate bucket (JWT-gated, global limit applies). Add one only if abuse is observed.

### CRM export & webhook (P-INT-01)

- **CSV export:** `GET /admin/enquiries/export` (PLATFORM_ADMIN) — same filters as the queue (`status`, `intent`, `routing`, plus `from` / `to` ISO dates), newest first, capped at 10 000 rows. Columns: enquiry id/date/contact/message/intent/source/status, routed partner + listing, partner **lead id + lead status**. Cells are formula-injection-safe and UTF-8 BOM-prefixed for Excel. UI: **Export CSV (CRM)** button on `/admin/enquiries`.
- **Outbound webhook (optional):** set **both** `CRM_WEBHOOK_URL` and `CRM_WEBHOOK_SECRET` (≥16 chars; boot fails if only one is set, or if the URL is not `https://` in production). Events: `enquiry.created`, `enquiry.routed` (admin assigns/re-routes to a partner).
  - `POST` JSON `{ id, event, createdAt, data }` with headers `X-Garud-Event`, `X-Garud-Delivery` (uuid, stable across retries), `X-Garud-Timestamp` (unix s), `X-Garud-Signature: sha256=<hex>`, `X-Request-Id`.
  - Verify: `HMAC_SHA256(secret, "<timestamp>.<raw body>")`; reject if the timestamp is older than ~5 min (replay window) and dedupe on `X-Garud-Delivery`.
  - Delivery is fire-and-forget (never blocks or fails the enquiry): 5 s timeout, up to 3 attempts with 0.5 s / 1 s backoff on network errors, 5xx, 408, 429. Tune with `CRM_WEBHOOK_TIMEOUT_MS`, `CRM_WEBHOOK_MAX_ATTEMPTS`, `CRM_WEBHOOK_RETRY_DELAY_MS`.
  - Limitation: no persistent outbox — if the API restarts mid-retry or the CRM is down for >~2 s of backoff, the event is dropped (logged at error). Use the CSV export to backfill.

### Notifications (email + in-app)

- `NotificationService` (domain events) → **ports**: `MAIL_PROVIDER` (default SMTP/log `MailService`; swap in SES/SendGrid by providing another `MailProvider`) and `InAppNotificationService` (`in_app_notifications` table).
- In-app (bell) is created for: partner owner on new/assigned lead, partner owner on KYC decision, invited vendors on new RFQ; **buyers** on RFQ quote received and order fulfillment updates. API: `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all`. The header bell polls every 60 s (desktop + mobile drawer).
- No per-user preferences, push/SMS, or retention job yet.

### Data retention & privacy (stub — P2-3)

> Working defaults for counsel/Biz to confirm. **No automated purge jobs exist yet**; this is the policy to implement and the data inventory.

| Data | Table(s) | PII | Proposed retention |
|------|----------|-----|---------------------|
| Enquiries / leads | `enquiries`, `leads` | name, email, phone, free text | 24 months after last activity, then delete or anonymise |
| Accounts | `users`, `organizations` | email, company, GST/KYC | Life of account; on closure soft-disable (`disabled_at`), erase on verified request unless a legal hold applies |
| Partner KYC documents | `uploads/` + document rows | identity / business docs | Life of account + 12 months after rejection/closure |
| Orders, payments, invoices | `orders`, payment intents, billing | buyer details, amounts | **Statutory — typically 8 years** for Indian GST/accounting records; confirm with accountant; never purge |
| RFQ / quotations / messages | `rfqs`, `quotations`, `messages` | contact details, commercial terms | 36 months after close |
| Refresh tokens | `refresh_tokens` | none (hash) | Purge when expired/revoked > 30 days |
| In-app notifications | `in_app_notifications` | titles may name a contact | Purge read items > 90 days |
| Audit logs | `verification_audit_logs`, `admin_user_audit_logs` | admin emails | 24 months minimum (security evidence) |
| Application logs | pm2/journald | IPs, user ids (no bodies/queries) | 30–90 days via logrotate |
| Backups | `pg_dump` / provider snapshots | all | 30 days rolling; erasure requests age out with the rotation |

Suggested first jobs (cron / `psql`, run after a backup):

```sql
DELETE FROM refresh_tokens WHERE (expires_at < now() - interval '30 days') OR (revoked_at < now() - interval '30 days');
DELETE FROM in_app_notifications WHERE read_at < now() - interval '90 days';
```

Still needed: published privacy policy matching this table, a DSAR (export/erase) procedure, cookie/consent review (JWT in localStorage — P-BE-06), and a DPA with SMTP/Razorpay/Cloudflare as processors. CRM webhook/CSV exports copy PII out of the system — restrict who holds `PLATFORM_ADMIN` and treat the receiving CRM as a processor.

### CDN for static & snapshot assets (P2-4)

- Cloudflare already fronts the site; static files in `frontend/public/assets/**` (marketing snapshot images/CSS/JS) are served by Next with `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` (`next.config.ts`). Next's own hashed build assets (`/_next/static/*`) are already `immutable` for a year.
- Cloudflare dashboard (Ops): Caching → keep **Standard**; add a Cache Rule "Cache eligible" for `/assets/*` and `/_next/static/*` (Edge TTL: respect origin). **Never cache** `/platform-api/*`, `/api/*`, `/admin/*`, `/partner/*`, `/buyer/*` (authenticated / per-user) — add a bypass rule for those paths. Purge `/assets/*` after replacing snapshot assets (files are not content-hashed, hence the 1-day TTL).
- Uploads (`UPLOAD_DIR`) are private and API-served — do **not** put them behind a public CDN; move to private S3/R2 with signed URLs (P1-4).
- Optional later: Cloudflare Images/Polish for listing media; hashing snapshot asset filenames to allow `immutable`.

### Database connection pooling (P2-4)

Prisma opens a pool **per Node process**: default size `num_physical_cpus * 2 + 1` (≈5 on 2 vCPU), pool timeout 10 s. Postgres defaults to `max_connections=100`; managed tiers often allow 20–100 (Neon free/small, DO basic ≈ 25).

Recommended `DATABASE_URL` parameters:

| Setup | Example | Notes |
|-------|---------|-------|
| Single VPS, Postgres in docker, 1 API process | `postgresql://u:p@127.0.0.1:5432/garudhub?schema=public&connection_limit=10&pool_timeout=20&connect_timeout=10` | 10 ≥ default; leaves ample headroom under 100 |
| pm2 cluster / 2–3 API instances | `…&connection_limit=5&pool_timeout=20` | Budget: `instances × connection_limit` + ~10 (migrations, psql, backups) ≤ `max_connections` |
| Managed Postgres **with PgBouncer / pooled endpoint** (Neon, Supabase, RDS Proxy) | `postgresql://…-pooler…/garudhub?sslmode=require&pgbouncer=true&connection_limit=5&connect_timeout=15` | `pgbouncer=true` disables prepared statements. **Run `prisma migrate deploy` against the direct (non-pooled) URL** — set `directUrl` in the Prisma datasource when adopting a pooler (not wired today) or export a direct `DATABASE_URL` for the deploy step only |
| Managed Postgres, direct, TLS | `…?sslmode=require&connection_limit=5&connect_timeout=15` | Use `sslmode=verify-full` + CA if the provider supplies one |

Review checklist:

1. Compute the budget above before adding API instances; `PrismaClientKnownRequestError P2024` ("timed out fetching a connection") in logs means the pool is exhausted → raise `connection_limit` or add pooling, not just `pool_timeout`.
2. Hot spots are admin analytics/overview/audit (merge-on-read, up to 20k rows) — run them sparingly; consider read replicas only if they dominate.
3. `PrismaService` connects on boot and disconnects on shutdown (no manual pool code). Keep `pm2` graceful reload so connections are released.
4. Monitor `SELECT count(*) FROM pg_stat_activity;` during load tests; alert at 80 % of `max_connections`.
5. No load test has been run for this review — numbers above are conservative defaults, not measured.

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
**Checklist (NEXT-L2):** [`STAGING_SMOKE_CHECKLIST.md`](./STAGING_SMOKE_CHECKLIST.md)

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
