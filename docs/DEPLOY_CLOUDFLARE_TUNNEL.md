# GarudHub — Cloudflare Tunnel deploy runbook

Practical steps to expose GarudHub (Next.js + NestJS + PostgreSQL) on the public internet using **Cloudflare Tunnel (`cloudflared`)**, with a **dev (staging)** and **main (production)** branch model.

**Repository:** [github.com/nigmanand-create/Garud](https://github.com/nigmanand-create/Garud)

**Placeholder hostnames** (replace with your real domain):

| Environment | Git branch | Suggested hostname |
|-------------|------------|--------------------|
| Staging     | `dev`      | `dev.garudhub.example` |
| Production  | `main`     | `app.garudhub.example` (or apex `garudhub.example`) |

Optional dedicated API hostname for Razorpay webhooks and Swagger (bypasses Next proxy):

| Purpose | Suggested hostname | Upstream |
|---------|-------------------|----------|
| API only (prod) | `api.garudhub.example` | `http://127.0.0.1:3000` |
| API only (staging) | `api-dev.garudhub.example` | `http://127.0.0.1:3000` |

---

## 1. How the app is wired locally

| Service | Port | Notes |
|---------|------|--------|
| **Frontend** (Next.js 15) | **3001** | `npm run dev` / `npm run start` in `frontend/` |
| **Backend** (NestJS 11) | **3000** | Global prefix `api/v1`; Swagger at `/api/docs` |
| **PostgreSQL** | **5434** (host) | `docker compose up -d` — maps container `5432` → host `5434` |

The browser calls **`NEXT_PUBLIC_API_URL=/platform-api/v1`** (same origin). Next.js proxies to the API via `frontend/app/platform-api/v1/[...path]/route.ts` using **`BACKEND_URL=http://127.0.0.1:3000`**.

**Recommended tunnel layout:** point the **app hostname** at **frontend `:3001` only**. Users and JWT calls stay same-origin; no CORS changes. Set `BACKEND_URL` to the loopback API on the same machine.

**Razorpay webhooks:** configure either:

- `https://app.garudhub.example/platform-api/v1/payments/webhook` (through Next proxy), or  
- `https://api.garudhub.example/api/v1/payments/webhook` (direct to Nest; add a second ingress in `config.yml`).

There is **no root `Dockerfile`**, **no GitHub Actions**, and **no app containers** in repo today — only `docker-compose.yml` for Postgres. Deploy = build on the host (or add Docker later).

---

## 2. Branch model (dev = staging, main = production)

### Current git state (as of prep doc)

- **`main`** — initial monorepo + README (`1048262`). **Does not** include payments, RFQ phases, commerce, or platform UI unification.
- **`feature/task-003-004-payments-workflow`** — **6 commits ahead of `main`** with the full MVP spine (payments, RFQ, orders, E2E, marketing/platform UI). This is what you likely want on **`main`** before first production deploy.
- **`dev` branch** — **does not exist yet** on remote; create it after you decide staging workflow.

### Suggested workflow

1. Merge **`feature/task-003-004-payments-workflow` → `main`** (PR or local merge), after review and tests.
2. Create **`dev`** from `main` (or from `main` before merge if you want staging to trail prod — usually **`dev` tracks `main`** and receives PRs first).
3. **Staging server** checks out **`dev`**, runs migrations/seed as needed, tunnel → `dev.*`.
4. **Production server** checks out **`main`**, tunnel → `app.*` (or apex).

### Local WIP **not** on the feature branch commits

Uncommitted work on the feature branch (assistant widget, vitest, plan doc, etc.) is **optional for deploy** — merge or stash separately:

- `docs/DRONE_ASSISTANT_CHAT_PLAN.md`, `frontend/components/assistant/`, `frontend/lib/assistant/`, `frontend/vitest.config.ts`
- Tweaks: `DEMO_ACCOUNTS.md`, `backend/prisma/seed.ts`, `backend/tsconfig.json`, `frontend/.env.example`, `MarketingShell`, `platform.css`, `package.json`

**Minimum to merge before deploy:** the **6 feature-branch commits** (not necessarily the assistant WIP unless you want it live).

---

## 3. Merge + push checklist (GitHub `nigmanand-create/Garud`)

- [ ] On feature branch: `npm test` / `npm run test:e2e` in `backend/`; `npm run build` in `frontend/` and `backend/`.
- [ ] Open PR: `feature/task-003-004-payments-workflow` → `main`, or merge locally and push.
- [ ] **Do not force-push `main`.**
- [ ] After merge: `git checkout main && git pull origin main`.
- [ ] Create staging branch: `git checkout -b dev && git push -u origin dev` (first time only).
- [ ] Tag release optional: `git tag v0.1.0 && git push origin v0.1.0`.
- [ ] On each server: `git fetch && git checkout dev|main && git pull`.

---

## 4. Server prerequisites

- **Node.js** ≥ 20.11 (`backend/package.json` engines).
- **npm** install in `backend/` and `frontend/`.
- **PostgreSQL 16** — local Docker (`docker compose up -d`) or managed (Neon, Supabase, RDS, etc.). Update **`DATABASE_URL`** accordingly.
- **Persistent disk** for `backend/uploads/` (partner docs, listing images). Container/ephemeral hosts lose uploads on restart until S3/R2 is implemented.

### Production build commands

```bash
# Postgres (local on server)
docker compose up -d

# Backend
cd backend
cp .env.example .env   # edit secrets — see §5
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run build
npm run start:prod     # or systemd — PORT=3000

# Frontend (separate terminal or second systemd unit)
cd frontend
cp .env.example .env.local   # edit — see §5
npm ci
npm run build
npm run start            # listens on 3001
```

Use **process manager** (systemd, pm2, launchd) so API and Next restart on boot.

---

## 5. Environment variables (production)

### `backend/.env`

| Variable | Production notes |
|----------|------------------|
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Managed Postgres connection string (SSL params as provider requires) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Long random strings (≥32 chars); **never** reuse demo values |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Keep or tighten per policy |
| `UPLOAD_DIR` | Absolute path on persistent volume, e.g. `/var/garudhub/uploads` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | **Live** keys when go-live; test keys for staging |
| `RAZORPAY_WEBHOOK_SECRET` | From Razorpay dashboard; webhook URL must match tunnel hostname |
| `DEMO_PASSWORD`, `ADMIN_*` | Omit or rotate if you run `prisma:seed` on staging only |

### `frontend/.env.local` (or `.env.production`)

| Variable | Production notes |
|----------|------------------|
| `NEXT_PUBLIC_API_URL` | `/platform-api/v1` (same-origin; **do not** point browser at raw `:3000` unless you add CORS) |
| `BACKEND_URL` | `http://127.0.0.1:3000` on same host as Next |
| `NEXT_PUBLIC_ASSISTANT_ENABLED` | `false` until assistant is merged and tested; `true` on staging if desired |

---

## 6. PostgreSQL: local vs managed

| Option | When | `DATABASE_URL` example |
|--------|------|-------------------------|
| **Docker on server** (repo `docker-compose.yml`) | Single VPS, demos, staging | `postgresql://garud:STRONG_PASSWORD@127.0.0.1:5434/garudhub?schema=public` |
| **Managed** (Neon, Supabase, Cloud SQL, RDS) | Production, backups, HA | Provider connection string; run `prisma migrate deploy` from CI or deploy script |

Staging and production should use **separate databases**. Do not point `dev` and `main` deployments at the same `DATABASE_URL`.

---

## 7. Cloudflare Tunnel setup (you run interactive steps)

These steps require your Cloudflare account (login in browser). **Do not commit tunnel credentials or `credentials.json`.**

### 7.1 Install `cloudflared`

- macOS: `brew install cloudflared`
- Linux: [Cloudflare package repo](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)

### 7.2 Authenticate (interactive)

```bash
cloudflared tunnel login
```

Select the zone that contains your domain (e.g. `garudhub.com`).

### 7.3 Create tunnels (one per environment recommended)

```bash
# Staging
cloudflared tunnel create garudhub-dev

# Production
cloudflared tunnel create garudhub-prod
```

Note the **Tunnel UUID** and credentials file path.

### 7.4 DNS (Cloudflare dashboard or CLI)

For each hostname, create a **CNAME** to `<TUNNEL_UUID>.cfargotunnel.com` (proxied orange cloud is fine).

Example records:

- `dev` → staging tunnel → `dev.garudhub.example`
- `app` → prod tunnel → `app.garudhub.example`
- `api-dev` / `api` → optional API ingress

Or use:

```bash
cloudflared tunnel route dns garudhub-dev dev.garudhub.example
cloudflared tunnel route dns garudhub-prod app.garudhub.example
```

### 7.5 Config file

Copy the example and edit paths/hostnames:

```bash
mkdir -p ~/.cloudflared
cp deploy/cloudflared/config.example.yml ~/.cloudflared/config.yml
# Edit tunnel ID, credentials-file, hostnames
```

See **`deploy/cloudflared/config.example.yml`** for ingress: frontend `:3001`, optional API `:3000`.

### 7.6 Run tunnel

```bash
# Foreground test
cloudflared tunnel --config ~/.cloudflared/config.yml run

# Install as system service (Linux)
sudo cloudflared service install
sudo systemctl start cloudflared
```

Ensure **Next (3001)** and **API (3000)** are listening before starting the tunnel.

### 7.7 Razorpay

In Razorpay dashboard (staging vs live mode per environment):

- Webhook URL: `https://app.garudhub.example/platform-api/v1/payments/webhook`  
  or `https://api.garudhub.example/api/v1/payments/webhook`
- Set `RAZORPAY_WEBHOOK_SECRET` in `backend/.env` to match.

---

## 8. Two-server vs one-server layout

| Layout | Staging | Production |
|--------|---------|------------|
| **One machine** | `dev` branch, tunnel `garudhub-dev`, ports 3000/3001 (or offset staging ports + matching ingress) | `main` branch, second tunnel, same ports when switched — **run one env at a time** or use different ports |
| **Two machines** (recommended) | Mac mini / VPS #1: checkout `dev`, dev tunnel | VPS #2: checkout `main`, prod tunnel |

Cloudflare Tunnel avoids opening inbound firewall ports; the agent only needs outbound HTTPS.

---

## 9. Post-deploy smoke test

1. `https://app.garudhub.example/marketplace` loads.
2. Login with a seeded or real user (`DEMO_ACCOUNTS.md` — rotate passwords in prod).
3. Browser network tab: API calls go to `/platform-api/v1/...` (200/401, not 502).
4. `https://app.garudhub.example/platform-api/v1/health` or marketplace listings endpoint.
5. Optional: Swagger only on staging/VPN — `http://127.0.0.1:3000/api/docs` (do not expose publicly unless intended).
6. Place test Razorpay order on staging; confirm webhook in Razorpay logs.

---

## 10. Related repo files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Postgres only |
| `backend/.env.example` | API secrets template |
| `frontend/.env.example` | Next proxy + assistant flag |
| `deploy/cloudflared/config.example.yml` | Tunnel ingress template |
| `deploy/docker-compose.prod.example.yml` | Optional Postgres + notes for future app containers |
| `DEMO_ACCOUNTS.md` | Demo logins (staging) |
| `backend/LOCAL_DEVELOPMENT.md` | Local dev flow |

---

## 11. Security reminders

- Tunnel credentials and `.env` files stay **out of git**.
- Use strong JWT secrets and DB passwords on production.
- Set `NEXT_PUBLIC_ASSISTANT_ENABLED=false` on prod until the assistant ships.
- Plan durable object storage (S3/R2) before scaling partners — local `uploads/` is not HA.
