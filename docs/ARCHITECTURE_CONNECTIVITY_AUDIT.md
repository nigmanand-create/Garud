# Garud Monorepo — Architecture Connectivity Audit

**Date:** 2026-11-05  
**Scope:** Frontend ↔ backend wiring, auth session path, Nest module registration, deploy/CI env alignment, snapshot bridges vs React routes, and broken API links.  
**Method:** Static review of `next.config.ts`, `middleware.ts`, `frontend/app/platform-api/v1/[...path]/route.ts`, `frontend/lib/api/*`, backend controllers/modules, deploy examples, and CI workflows. No long-running integration tests were executed.

---

## Request flow (production-shaped)

Browser traffic is intended to hit **Next.js on `:3001`** (Cloudflare Tunnel / PM2). Platform API calls use a **same-origin proxy** so httpOnly auth cookies work without CORS.

```mermaid
flowchart LR
  subgraph edge [Edge]
    CF[Cloudflare Tunnel / DNS]
  end
  subgraph host [App host]
    NX[Next.js :3001]
    PX["/platform-api/v1/* route.ts"]
    API[NestJS :3000 /api/v1/*]
    DB[(PostgreSQL)]
  end
  Browser --> CF --> NX
  Browser -->|"fetch NEXT_PUBLIC_API_URL=/platform-api/v1"| NX
  NX --> PX
  PX -->|"BACKEND_URL + Cookie/Auth/raw body"| API
  API --> DB
  Razorpay[Razorpay webhooks] -->|"POST .../platform-api/v1/payments/webhook"| NX --> PX --> API
```

**Path mapping:** `/platform-api/v1/{path}` → `{BACKEND_URL}/api/v1/{path}` (see `frontend/app/platform-api/v1/[...path]/route.ts`).

**Legacy compatibility:** `next.config.ts` rewrites `/api/v1/*` → `/platform-api/v1/*` and `/api/enquiry` → `/platform-api/v1/enquiries`. Snapshot HTML localization maps legacy `garudhub.com/api/*` URLs to `/platform-api/v1/*`. The former external rewrite to `https://garudhub.com/api/*` is **removed** so Garud API traffic stays on Nest.

---

## Connected ✅

| Area | Frontend surface | Backend route prefix / module | Status |
|------|------------------|----------------------------------|--------|
| **API base** | `getApiBase()` → `NEXT_PUBLIC_API_URL` default `/platform-api/v1` (`frontend/lib/api/client.ts`) | Global prefix `api/v1` (`backend/src/main.ts`) | ✅ Aligned via proxy |
| **Proxy → Nest** | `platform-api/v1/[...path]/route.ts` | Forwards Cookie, Authorization, `x-request-id`, client IP, Razorpay raw body + headers; exports **GET, HEAD, POST, PUT, PATCH, DELETE** | ✅ |
| **Auth** | `authApi`, `AuthProvider`, `usesCookieSession()` (`lib/api/auth-storage.ts`) | `auth/*`, JWT from cookie or bearer (`jwt.strategy.ts`, `auth-session.helper.ts`) | ✅ Cookie-first; break-glass documented |
| **Marketplace** | `lib/api/marketplace.ts`, marketplace pages | `marketplace/*` (`MarketplaceController`) | ✅ |
| **Cart / checkout** | `lib/api/cart.ts`, buyer checkout page | `buyer/cart`, `buyer/checkout` (`CommerceModule`) | ✅ |
| **Orders** | Buyer/partner/admin order pages, `payments.ts` | `buyer/orders`, `partner/orders`, `admin/orders`, `payments/*` | ✅ |
| **Payments / webhooks** | Checkout Razorpay + bank transfer | `POST payments/webhook` (raw body in `main.ts`); proxy forwards signature headers | ✅ Documented staging/prod URLs |
| **RFQ** | Buyer/partner RFQ pages; signed-out `/buyer/rfqs` redirects to `/auth/login/buyer` | `rfq`, `partner/rfqs` (`RfqModule`) | ✅ |
| **Partner onboarding** | Partner application, documents | `partner/me`, `partner/application`, `partner/documents` | ✅ |
| **Partner catalog** | Partner catalog CRUD, listing media | `partner/catalog/listings`, `media/listings` | ✅ |
| **Partner hub / billing** | Partner dashboard, subscription | `partner/overview`, `partner/subscription`, `admin/billing` | ✅ |
| **Admin ops** | `lib/api/admin.ts`, admin UI | `admin/overview`, `audit-log`, `users`, `leads`, `analytics` | ✅ |
| **Admin catalog / apps** | Listings & applications review | `admin/listings`, `admin/applications` | ✅ |
| **Enquiries** | `/enquiry`, `lib/api/enquiries.ts` | `POST enquiries`, `admin/enquiries`, `partner/leads` | ✅ PHP path retired → React |
| **Service requests** | `lib/api/service-requests.ts`, services UI | `POST service-requests` (intake), `service-requests/track/*`, buyer/partner/admin controllers | ✅ Intake + tracking wired |
| **Training** | Training API + partner institute UI | `training/courses`, `partner/training` | ✅ PUT via proxy |
| **Gov opportunities** | `lib/api/gov.ts`, gov admin/buyer flows | `gov/opportunities`, `buyer/gov-opportunities`, `admin/gov-opportunities` | ✅ |
| **Partnerships** | `lib/api/partnerships.ts` | `partner/partnerships`, `admin/partnerships` | ✅ |
| **Messages** | `lib/api/messages.ts` | `buyer/conversations`, `partner/conversations` | ✅ |
| **Notifications** | `lib/api/notifications.ts` | `notifications/*` | ✅ |
| **Health** | (ops / smoke) | `GET /api/v1/health` (`AppController`) | ✅ |
| **CRM webhooks (outbound)** | N/A (server-side) | `CrmWebhookService` when `CRM_WEBHOOK_URL` + `CRM_WEBHOOK_SECRET` set; validated in `env.validation.ts` | ✅ Optional integration |
| **Deploy topology** | PM2 `garudhub-web` `:3001`, `BACKEND_URL=127.0.0.1:3000` | PM2 `garudhub-api` `:3000` | ✅ Matches `deploy/pm2/ecosystem.config.example.js` + `deploy/cloudflared/config.example.yml` |
| **CI env** | `NEXT_PUBLIC_API_URL`, `BACKEND_URL` in workflows | Same as local proxy pattern | ✅ `.github/workflows/main-ci.yml`, `dev-ci.yml` |
| **Snapshot bridges** | `middleware.ts` + `lib/snapshot-bridge.ts` | Redirects legacy paths → React (`/marketplace`, `/services`, `/enquiry`, etc.) | ✅ Matcher kept in sync with bridge map |

**Backend module registration:** All feature areas above are imported in `backend/src/app.module.ts` (`Identity`, `Catalog`, `Commerce`, `Payments`, `Rfq`, `Partner`, `Admin`, `Enquiries`, `ServiceRequests`, `Training`, `Gov`, `Messages`, `PartnerHub`, `PartnerBilling`, `Partnerships`, `Documents`, `Notifications`, `Integrations`). Controllers under `backend/src/modules/**` match the frontend `apiRequest` paths reviewed (28 controller files).

**Prisma:** Services across listed modules inject `PrismaService`; domain models in `backend/prisma/schema.prisma` are exercised by those services (no orphan module without data access was found in this pass).

---

## Gaps ⚠️ (code vs ops)

| Severity | Description | Status |
|----------|-------------|--------|
| ~~**High**~~ | ~~Next proxy missing `PUT`~~ | **Closed** — `PUT` (+ `HEAD`) on `platform-api/v1/[...path]/route.ts` |
| ~~**Medium**~~ | ~~Legacy `/api/*` rewrite to garudhub.com~~ | **Closed** — `/api/v1/*` → `/platform-api/v1/*`; snapshot URLs → `/platform-api/v1` |
| **Medium** | **No CORS on Nest** (`main.ts` does not call `enableCors`). Correct for same-origin proxy; **breaks** if `NEXT_PUBLIC_API_URL` is set to `http://host:3000/api/v1` for direct browser calls (documented as optional in `frontend/README.md`). | **By design** — not required for production wiring |
| ~~**Low**~~ | ~~GOVERNMENT post-login redirect~~ | **Closed** — `GOVERNMENT` → `/government` (`lib/platform/auth-login.ts`) |
| **Low** | **CI backend `NODE_ENV=test`** forces `AUTH_SESSION_MODE=bearer` on API while frontend build defaults to cookie session (`auth-cookies.ts`). CI validates compile/tests, not full cookie proxy e2e. | **Accept for CI** — staging smoke for cookie path |
| ~~**Low**~~ | ~~`AUTH_COOKIE_SECURE` not in validator~~ | **Closed** — optional field in `env.validation.ts` |
| **Ops (external)** | Production tunnel, Razorpay live keys, webhook registration, CRM URL — **code wired**, host execution tracked in `docs/NEXT_TASK_LIST.md` (e.g. NEXT-L4 prod smoke). | **Runbook checklist** — `docs/DEPLOY_CLOUDFLARE_TUNNEL.md`, `docs/PAYMENTS_RUNBOOK.md` |

---

## Auth connectivity (detail)

| Check | Result |
|-------|--------|
| httpOnly cookies (`garud_access`, `garud_refresh`) | Set by Nest on login/register/refresh when `AUTH_SESSION_MODE` is `cookies` (default except test) |
| Proxy forwards `Cookie` on upstream fetch | Yes |
| Proxy forwards `Set-Cookie` from upstream | Yes (`getSetCookie` loop) |
| Client sends credentials | `credentials: 'include'` when cookie session |
| JWT validation | Cookie first, then `Authorization` bearer (`jwt.strategy.ts`) |
| Role gates in UI | `RequireAuth` + role-specific login redirect + `redirectPathAfterLogin` |

---

## Deploy & env parity

| Variable | Local example | PM2 example | CI |
|----------|---------------|-------------|-----|
| `NEXT_PUBLIC_API_URL` | `/platform-api/v1` | (set on web app) | `/platform-api/v1` |
| `BACKEND_URL` | `http://127.0.0.1:3000` | `http://127.0.0.1:3000` | `http://127.0.0.1:3000` |
| Web port | dev default | **3001** | n/a |
| API port | **3000** | **3000** | test DB + Nest tests |
| Tunnel | — | **→ 127.0.0.1:3001** (app hostname) | — |

Razorpay webhook (recommended): `https://<app-host>/platform-api/v1/payments/webhook` (proxied) or direct `https://api.<host>/api/v1/payments/webhook` (second tunnel ingress).

---

## Overall verdict

**Code-level frontend ↔ backend wiring: 100%**

All reviewed platform surfaces use `/platform-api/v1` → Nest `/api/v1`, proxy methods cover mutating verbs used by the client, legacy snapshot API URLs are bridged to the same-origin proxy, auth session forwarding is complete, and env validation includes optional auth cookie flags.

**Ops / host proof is a separate checklist** (tunnel ingress, live Razorpay keys, webhook registration, production smoke). Track those in deploy runbooks and `docs/NEXT_TASK_LIST.md`; they do not reduce code wiring completeness.

---

## Files reviewed (primary)

- `frontend/next.config.ts`, `frontend/middleware.ts`, `frontend/app/platform-api/v1/[...path]/route.ts`
- `frontend/lib/api/*.ts`, `frontend/components/platform/AuthProvider.tsx`
- `frontend/lib/snapshot-bridge.ts`, `frontend/lib/snapshot-html.ts`, `frontend/app/enquiry.php/route.ts`
- `backend/src/app.module.ts`, `backend/src/main.ts`, `backend/src/config/env.validation.ts`
- `backend/src/modules/**/**.controller.ts`
- `deploy/pm2/ecosystem.config.example.js`, `deploy/cloudflared/config.example.yml`
- `.github/workflows/main-ci.yml`, `.github/workflows/dev-ci.yml`
