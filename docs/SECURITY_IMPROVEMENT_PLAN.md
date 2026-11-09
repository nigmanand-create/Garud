# GarudHub — Security improvement plan

**Date:** 9 November 2026  
**Code baseline:** `dev` (Nest API + Next platform, same-origin `/platform-api` proxy)  
**Audience:** Dev, Ops, QA — complements [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) P0/P1 tables and [NEXT_TASK_LIST.md](./NEXT_TASK_LIST.md) launch gates.

**Related runbooks:** [AUTH_HTTPONLY.md](./AUTH_HTTPONLY.md) · [PAYMENTS_RUNBOOK.md](./PAYMENTS_RUNBOOK.md) · [DEPLOY_RUNBOOK_STEP_BY_STEP.md](./DEPLOY_RUNBOOK_STEP_BY_STEP.md)

---

## Executive summary

GarudHub’s security posture for MVP is **strong in code paths that were explicitly hardened** (env boot validation, JWT + role guards, global validation pipe, IP throttling, Razorpay webhook HMAC on raw body, httpOnly cookies via Next proxy, OTP hashes at rest). **Launch risk is concentrated in ops proof and edge configuration**, not in missing core auth modules.

| Dimension | Posture | Primary gap |
|-----------|---------|-------------|
| **Authentication** | Cookie session default; OTP + Google + email/password; `JwtAuthGuard` + `RolesGuard` on privileged routes | OTP verify brute-force budget; optional phone user enumeration |
| **API exposure** | Browser traffic intended **same-origin** through Next (`frontend/app/platform-api/v1/[...path]/route.ts`) | Direct `:3000` ingress must stay blocked; `X-Forwarded-For` trust chain |
| **Payments** | Signature verify + prod refuse without `RAZORPAY_WEBHOOK_SECRET` (`payments.service.ts`) | Staging/live webhook smokes (**P0-PAY3/4**) still open in task list |
| **Abuse** | Global `PublicPostThrottleGuard` + per-route `@Throttle` buckets (`throttle.config.ts`) | Edge WAF; tune limits from real 429 telemetry |
| **Secrets** | `validateEnv` in `backend/src/config/env.validation.ts` | Host execution of rotation; `OTP_CODE_PEPPER` not first-class in validation |
| **Data** | Prisma ORM; OTP `codeHash`; refresh `tokenHash` | KYC/listing media path authorization reviews; backup/restore (P1-5) |

**Recommendation:** Finish **Phase 0 payment + staging smokes** and **Cloudflare WAF** before marketing go-live; schedule **0–30 day** items (OTP hardening, CSRF posture doc, dependency scanning) in the first sprint after launch.

---

## Light threat model

### Assets

- **User & org PII** — email, phone, KYC documents, messages, RFQ content (`Prisma` models under `backend/prisma/schema.prisma`).
- **Session integrity** — `garud_access` / `garud_refresh` httpOnly cookies; refresh rows in `refresh_tokens`.
- **Money & orders** — Razorpay orders, `PaymentTransaction`, subscription state (`payments`, `partner-billing` modules).
- **Platform trust** — admin actions (KYC, partnerships, gov bids), partner listings, enquiry routing.
- **Secrets on host** — JWT secrets, Razorpay keys/webhook secret, CRM webhook secret, S3 keys, SMTP.

### Actors

| Actor | Motivation | Typical technique |
|-------|------------|-------------------|
| Anonymous internet | Spam, credential stuffing, enquiry flood | High-volume POSTs, OTP/SMS cost abuse |
| Buyer / partner (authenticated) | IDOR, privilege creep | Cross-org IDs in URLs/bodies |
| Malicious checkout | Payment fraud, webhook spoofing | Forged callbacks if secret missing |
| Insider / compromised admin | Data exfil, trust destruction | Stolen admin session |
| Supplier (Razorpay, SMS, Cloudflare) | Availability, misconfiguration | Wrong webhook URL, leaked test keys on prod |

### Trust boundaries

```text
[Browser] --HTTPS--> [Cloudflare Tunnel] --> [Next :3001 /platform-api/* proxy]
                                                      |
                                                      v (BACKEND_URL, raw body for webhooks)
                                               [Nest :3000 api/v1/*]
                                                      |
                                                      v
                                               [Postgres + upload storage]
```

**Design assumption:** Public users never call Nest directly; the Next proxy forwards `Cookie`, `Authorization`, `x-razorpay-signature`, and **client IP** (`cf-connecting-ip` / `x-forwarded-for`) so Nest `trust proxy` + throttlers see the visitor, not the Next server.

**Out of scope for this doc:** Physical host hardening, Cloudflare account IAM, and third-party pen tests (listed in 90d+ roadmap).

---

## Repo-specific control map (current)

| Area | Location | What it does |
|------|----------|--------------|
| Env validation | `backend/src/config/env.validation.ts` | JWT min length; weak-secret markers; live Razorpay when `GARUD_DEPLOY_ENV=production`; CRM webhook URL+secret pairing |
| Bootstrap | `backend/src/main.ts` | `rawBody: true` (Razorpay HMAC), `helmet`, `cookieParser`, `trust proxy` 1, global `ValidationPipe` whitelist |
| Throttle | `backend/src/app.module.ts`, `public-post-throttle.guard.ts`, `throttle.config.ts` | APP_GUARD on all routes; buckets for auth/OTP/enquiry |
| Auth guards | `jwt-auth.guard.ts`, `roles.guard.ts`, `verified-partner.guard.ts`, `optional-jwt-auth.guard.ts` | JWT passport + `@Roles()` metadata |
| Auth routes | `auth.controller.ts` | `@Throttle` on register/login/OTP/refresh; `applyAuthSession` cookies |
| OTP | `otp-auth.service.ts`, `OtpChallenge` model | SHA-256(pepper+phone+code); per-phone window limit; SMS fail-closed in production |
| Payments webhook | `payments.controller.ts`, `payments.service.ts` | Raw body signature; unsigned allowed only non-prod without secret |
| Next proxy | `frontend/app/platform-api/v1/[...path]/route.ts` | Preserves webhook signature headers and request body bytes |
| Frontend session | `frontend/lib/api/auth-storage.ts`, `AUTH_HTTPONLY.md` | Cookies default; bearer break-glass |
| Prisma | `backend/src/shared/prisma/` | Parameterized queries; limited `$queryRaw` / `$executeRaw` (payments advisory lock, analytics) |

---

## Findings table (P0–P3)

Priorities align with [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) and open checkboxes in [NEXT_TASK_LIST.md](./NEXT_TASK_LIST.md).

| ID | Sev | Finding | Evidence / area | Recommended action | Owner |
|----|-----|---------|-----------------|-------------------|-------|
| **SEC-F01** | **P0** | Staging/live **payment + webhook smokes** not signed off | NEXT **P0-PAY3**, **P0-PAY4** open | Execute [STAGING_SMOKE_CHECKLIST.md](./STAGING_SMOKE_CHECKLIST.md) + [PAYMENTS_RUNBOOK.md](./PAYMENTS_RUNBOOK.md) §3 on staging, then prod smoke | QA/Ops |
| **SEC-F02** | **P0** | **Cloudflare WAF / bot rules** not evidenced in repo | P1-2 checkbox: Helmet done; WAF **Ops** | Enable OWASP/Core rulesets, rate-limit auth paths at edge, geo rules if needed | Ops |
| **SEC-F03** | **P0** | **Direct API ingress** bypasses Next IP forwarding | Tunnel docs; throttlers key off IP | Keep Razorpay/webhooks on Next path only; block public `:3000` except loopback; document in deploy runbook | Ops/Dev |
| **SEC-F04** | **P0** | **Production webhook secret** must exist on host | `handleRazorpayWebhook` rejects prod without secret; **P0-SEC5** | Verify `RAZORPAY_WEBHOOK_SECRET` on prod host; dashboard URL = `/platform-api/v1/payments/webhook` | Ops/Dev |
| **SEC-F05** | **P1** | **OTP verify** lacks per-phone attempt budget (6-digit brute force within IP throttle window) | `otp-auth.service.ts` verify path; `@Throttle` auth bucket only | Add failed-attempt counter per `phoneE164` + lockout; optional constant-time compare | Dev |
| **SEC-F06** | **P1** | **OTP request user enumeration** (`NotFoundException` for unknown phone) | `requestOtp` | Return generic message + same status for unknown/disabled; log server-side | Dev |
| **SEC-F07** | **P1** | **`OTP_CODE_PEPPER`** not validated; falls back to `JWT_REFRESH_SECRET` | `hashOtpCode` in `otp-auth.service.ts` | Add optional env to `env.validation.ts`; require distinct pepper in production | Dev/Ops |
| **SEC-F08** | **P1** | **Cookie session CSRF** posture not documented for SPA | `SameSite=Lax` cookies; no double-submit token | Document acceptable risk for same-site app; add CSRF token or `SameSite=Strict` on refresh if cross-site flows added | Dev |
| **SEC-F09** | **P1** | **CSP / Next security headers** minimal vs API Helmet | `helmet({ contentSecurityPolicy: false })` in `main.ts` | Add Next `headers()` CSP for marketing pages; tighten script-src for platform shell | Dev |
| **SEC-F10** | **P1** | **Managed DB backups** (P1-5) open | NEXT_TASK_LIST P1-5 | Automated snapshots + tested restore | Ops |
| **SEC-F11** | **P1** | **Dependency / secret scanning** not in CI | `.github/workflows/dev-ci.yml` | Add `npm audit` gate (threshold), optional Dependabot/Snyk | Dev |
| **SEC-F12** | **P2** | **`otp_challenges` retention** — table grows with requests | Prisma `OtpChallenge` | Scheduled delete of expired rows; index already on `(phone_e164, created_at)` | Dev/Ops |
| **SEC-F13** | **P2** | **Public listing media** path `GET media/listings/:orgId/:fileName` | `listing-media.controller.ts` | Confirm upload naming unpredictability; consider signed URLs when on S3 | Dev |
| **SEC-F14** | **P2** | **Swagger** on staging if `SWAGGER_ENABLED=true` | `main.ts`, `swagger.setup.ts` | Keep off on prod; protect staging swagger with tunnel ACL or basic auth | Ops |
| **SEC-F15** | **P2** | **Admin audit trail** for high-impact actions | Admin module | Append-only audit log (who/when/what) for KYC, payments, partnership decide | Dev |
| **SEC-F16** | **P3** | **Dedicated API hostname** + strict CORS | P1-3 deferred | Only if mobile/third-party clients bypass Next proxy | Dev |
| **SEC-F17** | **P3** | **External penetration test** | — | Post-revenue baseline test | Biz/Ops |

---

## Phased roadmap

### 0–30 days (launch window + first hardening sprint)

**Goals:** Prove payments security on real hosts; close P0 ops gaps; quick Dev fixes that do not change product scope.

| Week | Work | Findings |
|------|------|----------|
| 0 (pre-launch) | Execute P0-PAY3/4, P0-SEC5 on host, NEXT-L2 smoke | SEC-F01, F04 |
| 0 | Cloudflare WAF + only Next ingress public | SEC-F02, F03 |
| 1–2 | OTP verify lockout + enumeration-neutral responses | SEC-F05, F06 |
| 2–3 | `OTP_CODE_PEPPER` in env validation + host value | SEC-F07 |
| 3–4 | CI: `npm audit` (backend + frontend), document CSRF stance | SEC-F08, F11 |

**Exit criteria:** Staging checkout + signed webhook recorded; prod webhook receives signed `payment.captured`; WAF enabled; OTP changes covered by unit tests.

### 30–90 days (operational maturity)

| Theme | Work | Findings |
|-------|------|----------|
| Edge + app headers | Next CSP, review Helmet options for API-only responses | SEC-F09 |
| Data resilience | Managed Postgres + restore drill | SEC-F10 |
| Abuse telemetry | Tune `THROTTLE_*` from 429 logs ([PRODUCTION_READINESS](./PRODUCTION_READINESS.md#rate-limits--abuse-review-p0-sec2-tuning)) | throttle.config.ts |
| Storage | Prefer S3/R2 presigned GET for KYC/gov bids ([S3_UPLOAD_STORAGE.md](./S3_UPLOAD_STORAGE.md)) | SEC-F13 |
| Compliance hygiene | Admin audit log MVP | SEC-F15 |
| Hygiene | OTP table cleanup job (cron or pg_boss) | SEC-F12 |

**Exit criteria:** One successful DB restore drill; audit log queryable for last 30 days of admin payment/KYC actions.

### 90 days+ (scale & assurance)

- Third-party penetration test and remediation backlog (SEC-F17).
- Optional `api.garudhub.me` with locked CORS and mTLS for partners (SEC-F16).
- Webhook outbox idempotency keys persisted for CRM + Razorpay event IDs (extend existing idempotent payment apply).
- Security champions: quarterly review of `env.validation.ts` and new public routes for `@Throttle` / guards.

---

## Quick wins (≤ 1 day each)

1. **Host check:** `RAZORPAY_WEBHOOK_SECRET`, live keys, JWT secrets — grep prod `.env` against [DEPLOY_RUNBOOK](./DEPLOY_RUNBOOK_STEP_BY_STEP.md) §P0-S1 / P0-SEC5 (Ops).
2. **Tunnel rule:** Confirm no public route maps to Nest `:3000` without Next (Ops).
3. **Staging webhook:** `curl` signed test payload per `payments.webhook.spec.ts` patterns via `/platform-api/v1/payments/webhook` (Dev/QA).
4. **Throttle smoke:** Repeated `POST /auth/login` → expect 429 per [PRODUCTION_READINESS](./PRODUCTION_READINESS.md) (QA).
5. **Break-glass audit:** Ensure prod uses `AUTH_SESSION_MODE=cookies`, not `bearer` + localStorage (Dev).
6. **CRM:** If `CRM_WEBHOOK_URL` set, confirm HTTPS + secret ≥16 chars (boot already enforces) (Ops).

---

## Verification checklist

Use after each deploy (staging → prod). Tie to `x-request-id` in logs ([NEXT-L5](./NEXT_TASK_LIST.md)).

| # | Check | Command / route | Pass |
|---|--------|-----------------|------|
| V1 | API boots with prod env | `NODE_ENV=production` + real secrets → no `validateEnv` throw | |
| V2 | Swagger disabled on prod | `GET /api/v1/docs` → 404 unless `SWAGGER_ENABLED=true` | |
| V3 | Rate limit | 11+ failed logins/min from one IP → HTTP 429 | |
| V4 | OTP request limit | 6+ `POST .../auth/otp/request` / min → 429 or phone window error | |
| V5 | Webhook bad signature | `POST .../payments/webhook` with wrong `x-razorpay-signature` → 400 | |
| V6 | Webhook good signature | Razorpay test event → 200; order/subscription state updated idempotently | |
| V7 | Session cookies | Login → `Set-Cookie` httpOnly, `Secure` on HTTPS, no tokens in `localStorage` (default) | |
| V8 | Proxy preserves body | Compare signature verification success only through `/platform-api/...` | |
| V9 | Role enforcement | Buyer JWT on admin route → 403 | |
| V10 | Health | `GET /platform-api/v1/health` via tunnel | |

**Automated:** `backend` — `payments.webhook.spec.ts`, `throttle.config.spec.ts`, identity e2e if present; run in CI before merge to `dev`.

---

## Maintenance

- Re-baseline this doc after **main production launch** or a major auth/payments change.
- When adding a **new public POST** route: default `@Throttle`, DTO whitelist, and document in the findings table if exempt.
- Cross-track open launch items in [NEXT_TASK_LIST.md](./NEXT_TASK_LIST.md); do not duplicate full Phase 0 runbook steps here.

---

*Generated from repository audit (Nest `backend/`, Next `frontend/`, `docs/`). Implementation tracked via engineering tasks — this file is the phased security backlog, not a substitute for host execution.*
