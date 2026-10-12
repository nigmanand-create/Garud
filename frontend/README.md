# GarudHub frontend

**One app, two surfaces:** the same Next.js server on `:3001` serves cloned marketing HTML at routes like `/` and `/about-us`, and the API-backed B2B UI at `/marketplace`, `/auth`, `/partner`, and related paths. Platform routes use the same **marketing header/footer** (`components/marketing/MarketingShell.tsx`) as the clone; snapshot pages bridge CTAs into `/marketplace` and `/auth/register`. The old marketing URL `/drone-accessories` redirects to `/marketplace?section=accessories` (accessories live in the unified marketplace). See `../PROJECT_TWO_TRACKS.md` for the full route map.

1. **Marketing replica** — cloned HTML snapshots (default routes like `/`, `/about-us`, …)
2. **Platform UI** — React app for the NestJS API (`/marketplace`, `/auth`, `/partner`, `/buyer`, `/admin`)

Marketing snapshot routes are unchanged (`app/route.ts`, `app/[...slug]/route.ts`, `lib/snapshot-html.ts`).

## Run (full stack)

**1. PostgreSQL**

```bash
cd /Users/blackstar/Desktop/dev/client/garud
docker compose up -d
```

**2. Backend** (port 3000)

```bash
cd backend
unset DATABASE_URL
nvm use 20
npm run prisma:migrate   # first time / after migrations
npm run prisma:seed      # demo users — see ../DEMO_ACCOUNTS.md
npm run start:dev
```

**3. Frontend** (port 3001)

```bash
cd frontend
cp .env.example .env.local   # optional; defaults work with proxy
npm install
npm run dev
```

Open:

- Marketing home: http://localhost:3001/
- Platform marketplace: http://localhost:3001/marketplace
- Swagger: http://localhost:3000/api/docs

**Demo logins** (after seed): see [DEMO_ACCOUNTS.md](../DEMO_ACCOUNTS.md) — e.g. `admin@garudhub.local` / `ChangeMeDemo123!`

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Browser API base (default `/platform-api/v1` same-origin proxy) |
| `BACKEND_URL` | Server proxy target (default `http://127.0.0.1:3000`) |

Direct browser calls to `http://localhost:3000/api/v1` are possible if you set `NEXT_PUBLIC_API_URL` and enable CORS on the backend; the included proxy avoids CORS in local dev.

Copy from `.env.example`:

```bash
cp .env.example .env.local
```

## Platform routes

| Route | Who | Backend APIs |
|-------|-----|----------------|
| `/marketplace` | Public | `GET /marketplace/listings` |
| `/marketplace/listings/[id]` | Public | `GET /marketplace/listings/:id` |
| `/marketplace/partners/[orgId]` | Public | `GET /marketplace/partners/:orgId` |
| `/auth/login` | All | `POST /auth/login`, refresh via client |
| `/auth/register` | All | `POST /auth/register` |
| `/partner` | Partner | `GET /partner/me` |
| `/partner/application` | Partner | `GET /partner/me`, `PATCH /partner/application`, `POST /partner/application/submit` |
| `/partner/documents` | Partner | `GET/POST/DELETE /partner/documents`, download |
| `/partner/catalog` | Verified partner | `GET/POST /partner/catalog/listings` |
| `/partner/catalog/new`, `/partner/catalog/[id]` | Verified partner | create/update/delete listing; `POST /partner/catalog/listings/images` (upload) |
| `/partner/orders`, `/partner/orders/[id]` | Verified partner | `GET /partner/orders`, `GET /partner/orders/:id`, `PATCH /partner/orders/:id/fulfillment` |
| `/partner/rfqs`, `/partner/rfqs/[id]` | Verified partner | `GET/POST /partner/rfqs`, quote/decline |
| `/buyer/rfqs`, `/buyer/rfqs/new`, `/buyer/rfqs/[id]` | Buyer / Government | `GET/POST /rfq`, quotations compare, close/cancel |
| `/buyer/cart` | Buyer / Government | `GET/DELETE /buyer/cart`, `POST/PATCH/DELETE /buyer/cart/items` |
| `/buyer/checkout` | Buyer / Government | `POST /buyer/checkout/place` |
| `/buyer/orders`, `/buyer/orders/[id]` | Buyer / Government | `GET /buyer/orders`, `GET /buyer/orders/:id` |
| `/admin`, `/admin/applications/[id]` | Platform admin | `GET/POST /admin/applications`, document download |

API proxy (Next.js): `/platform-api/v1/*` → `{BACKEND_URL}/api/v1/*`

Auth tokens are stored in `localStorage` (`garud_access_token`, `garud_refresh_token`) with automatic refresh on 401.

## Troubleshooting (platform)

| Symptom | Fix |
|---------|-----|
| `platform-api/.../marketplace/listings` **500** | Postgres up (`docker compose up -d`), then `cd backend && npm run prisma:migrate` |
| API unreachable | Backend on **:3000** — check `http://localhost:3000/api/v1/health` |
| `/auth/me` **401** in console when logged out | Expected before login; should not fire if no token (see `AuthProvider`) |
| `Cannot find module './887.js'` or `_next/static/*` **500** | Stale `.next`: stop dev (`Ctrl+C`), `lsof -ti :3001 \| xargs kill -9`, `rm -rf .next`, `npm run dev` only (avoid `npm run build` while dev is running) |
| `webpack.*.hot-update.json` **404** after deleting `.next` | Normal once — hard refresh the browser tab (Cmd+Shift+R) |

## Marketing replica

```bash
npm run verify-snapshots
npm run clone-pages   # refresh from live site
```

See `docs/SITE_AUDIT_AND_REBUILD_PLAN.md` for replacing snapshots with React over time.

## Checkout & catalog

Partner listings: **SKU**, **file upload or image URLs**, **INR list price** (or price on request). Buyers: **cart → checkout → orders** (offline payment pending). Partners: **incoming orders** + **fulfillment** (`PENDING` → `PROCESSING` → `SHIPPED` → `FULFILLED`). Details: [`../docs/CHECKOUT_AND_PARTNER_CATALOG_DESIGN.md`](../docs/CHECKOUT_AND_PARTNER_CATALOG_DESIGN.md).

After pulling: `cd backend && npm run prisma:migrate` (includes `20261007084251_order_fulfillment_and_listing_media`). Listing uploads use `UPLOAD_DIR` (default `backend/uploads`).

## Not in UI (no backend yet)

Leads, messages, **payment gateway**, notifications dashboard — see checkout design doc (Phase 3 payments).
