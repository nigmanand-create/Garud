# GarudHub — CI/CD for `dev` (staging)

Staging public URL: **[https://dev.garudhub.me](https://dev.garudhub.me)** (marketplace example: [drones section](https://dev.garudhub.me/marketplace?section=drones)).

The app still runs on **your Mac (or VPS)** with **Cloudflare Tunnel** to Next.js on port **3001**. GitHub Actions does **not** host the app; it validates code and can optionally SSH to your machine to deploy.

---

## Branch model

| Branch | Role | Public URL |
|--------|------|------------|
| `dev` | Staging | `dev.garudhub.me` |
| `main` | Production (future) | `garudhub.me` |

Production deploy and Razorpay webhooks use apex **`garudhub.me`** ([`DEPLOY_RUNBOOK_STEP_BY_STEP.md`](./DEPLOY_RUNBOOK_STEP_BY_STEP.md)); the Cloudflare template may use **`app.garudhub.me`** as an alternate prod ingress hostname.

---

## Continuous integration (automatic)

**Workflow:** [`.github/workflows/dev-ci.yml`](../.github/workflows/dev-ci.yml)

**Triggers:** push and pull requests targeting `dev`.

**Steps:**

1. Checkout
2. Node.js 20
3. PostgreSQL 16 service (port 5432)
4. **Backend:** `npm ci` → `prisma generate` → `prisma migrate deploy` → `npm test`
5. **Frontend:** `npm ci` → `npx tsc --noEmit` → `npm test` → `npm run build`

CI uses test env aligned with [`backend/.env.example`](../backend/.env.example) (JWT secrets, `DATABASE_URL` for the service container).

View runs: GitHub → **Actions** → **Dev CI**.

---

## Deploy to staging

### What must be running on the host

1. **Postgres** — `docker compose up -d` (repo root)
2. **Backend** — port **3000** (`backend/.env` production values)
3. **Frontend** — port **3001** (`frontend/.env.local`)
4. **cloudflared** — ingress to `http://127.0.0.1:3001` for `dev.garudhub.me`

Full tunnel setup: [`DEPLOY_CLOUDFLARE_TUNNEL.md`](./DEPLOY_CLOUDFLARE_TUNNEL.md).

### Option A — GitHub Actions (manual trigger)

**Workflow:** [`.github/workflows/deploy-dev.yml`](../.github/workflows/deploy-dev.yml)

**Trigger:** Actions → **Deploy Dev (staging)** → **Run workflow** (default ref: `dev`).

**Repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Purpose |
|--------|---------|
| `DEV_SSH_HOST` | Hostname or IP of the staging machine |
| `DEV_SSH_USER` | SSH user |
| `DEV_SSH_KEY` | Private key (PEM), no passphrase recommended for automation |
| `DEV_SSH_APP_DIR` | *(optional)* Path to git clone on server; default `~/Garud` |

On the server, clone once:

```bash
git clone git@github.com:nigmanand-create/Garud.git ~/Garud
cd ~/Garud && git checkout dev
# configure backend/.env and frontend/.env.local — never commit these
```

The workflow runs [`deploy/scripts/remote-deploy-dev.sh`](../deploy/scripts/remote-deploy-dev.sh) over SSH: pull `dev`, compose Postgres, migrate, build, restart **pm2** if installed.

Customize process names in that script or replace the pm2 block with **systemd** / **launchd** units.

### Option B — Deploy on the host (no secrets yet)

On the staging machine:

```bash
cd ~/Garud
git fetch origin && git checkout dev && git pull origin dev
bash deploy/scripts/remote-deploy-dev.sh
# restart cloudflared if needed
cloudflared tunnel --config ~/.cloudflared/config.dev.yml run
```

---

## Wiring SSH deploy later

1. Create a dedicated deploy key or user on the Mac/VPS.
2. Add the three required secrets above.
3. Optionally set `DEV_SSH_APP_DIR` if the repo is not in `~/Garud`.
4. Run **Deploy Dev (staging)** from Actions after merges to `dev`.

---

## Related files

| File | Purpose |
|------|---------|
| `.github/workflows/dev-ci.yml` | CI on `dev` |
| `.github/workflows/deploy-dev.yml` | SSH deploy (workflow_dispatch) |
| `deploy/scripts/remote-deploy-dev.sh` | Host-side pull, migrate, build, restart |
| `docs/DEPLOY_CLOUDFLARE_TUNNEL.md` | Tunnel + env runbook |
