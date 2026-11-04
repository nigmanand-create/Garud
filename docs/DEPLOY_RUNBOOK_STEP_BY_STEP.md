# GarudHub — deploy runbook (step-by-step)

Copy-paste procedures for **Phase 0 (P0)** ops tasks. Dev-owned automation lives in [`deploy/`](../deploy/); execution is on the host unless noted.

**Related:** [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) · [STAGING_SMOKE_CHECKLIST.md](./STAGING_SMOKE_CHECKLIST.md) · [PAYMENTS_RUNBOOK.md](./PAYMENTS_RUNBOOK.md)

---

## P0-H — Hosting & process supervisor

### P0-H1 — Always-on VPS

```bash
# Ubuntu 22.04+ example — run as deploy user
sudo apt update && sudo apt install -y git curl docker.io docker-compose-plugin
sudo usermod -aG docker "$USER"
# Clone once:
git clone https://github.com/YOUR_ORG/Garud.git ~/Garud && cd ~/Garud && git checkout dev
```

### P0-H2 — pm2 (API + web)

```bash
npm i -g pm2
cp deploy/pm2/ecosystem.config.example.js ~/Garud/deploy/pm2/ecosystem.config.js
# Edit cwd/env, then:
pm2 start ~/Garud/deploy/pm2/ecosystem.config.js
pm2 save
pm2 startup   # follow printed sudo command
```

**systemd alternative:** `deploy/systemd/garudhub-api.service.example` + `garudhub-web.service.example`.

### P0-H3 — cloudflared system service

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cf.deb
sudo dpkg -i cf.deb
sudo cloudflared service install
sudo cp deploy/cloudflared/config.example.yml /etc/cloudflared/config.yml
sudo systemctl enable --now cloudflared
```

### P0-H4 / P0-H5 — Staging & production hostnames

Edit tunnel ingress (see `deploy/cloudflared/config.garudhub.me.example.yml`):

- `dev.garudhub.me` → `http://127.0.0.1:3001`
- `garudhub.me` → `http://127.0.0.1:3001`
- Optional webhook/API: `garudhub.me/platform-api/*` or dedicated `api.garudhub.me`

```bash
sudo cloudflared tunnel route dns garudhub dev.garudhub.me
sudo cloudflared tunnel route dns garudhub garudhub.me
sudo systemctl restart cloudflared
```

---

## P0-S — Secrets & env

### P0-S1 — Production JWT secrets

```bash
openssl rand -base64 48   # JWT_ACCESS_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET
# Append to backend/.env on host ONLY (≥32 chars each)
```

### P0-S2 — No demo seed on prod

```bash
# remote-deploy-prod.sh never runs prisma:seed — verify:
grep -q 'prisma:seed' deploy/scripts/remote-deploy-prod.sh && echo 'FAIL: seed in prod script' || echo 'OK'
```

### P0-S3 — Host-only `.env`

```bash
chmod 600 ~/Garud/backend/.env ~/Garud/frontend/.env.local
# If secrets were ever committed: rotate JWT, Razorpay, webhook, CRM secrets immediately.
```

### P0-S5 — `GARUD_DEPLOY_ENV=production`

```bash
echo 'GARUD_DEPLOY_ENV=production' >> ~/Garud/backend/.env
# Enables live Razorpay validation in env.validation.ts
```

---

## P0-D — Database

### P0-D1 — Persistent Postgres volume

Use `deploy/docker-compose.prod.example.yml` — ensure `postgres_data` volume is named, not anonymous.

### P0-D2 — Migrations every deploy

```bash
cd ~/Garud/backend && npx prisma migrate deploy
# Wired in deploy/scripts/remote-deploy-{dev,prod}.sh
```

### P0-D3 — Backup + restore drill

```bash
cp deploy/scripts/pg-backup.example.sh ~/garud-pg-backup.sh && chmod +x ~/garud-pg-backup.sh
~/garud-pg-backup.sh   # creates timestamped dump
# Restore drill (staging only):
dropdb -h 127.0.0.1 -U garud garud_staging && createdb ...
pg_restore -h 127.0.0.1 -U garud -d garud_staging ~/backups/garud-YYYYMMDD.dump
cd ~/Garud/backend && npx prisma migrate deploy
bash deploy/scripts/post-deploy-health-check.sh
```

### P0-D4 — `DATABASE_URL`

```bash
# Must match docker-compose host/port/user/db name for that environment
psql "$DATABASE_URL" -c 'select 1'
```

### P0-SEC5 — Razorpay webhook secret

```bash
# Razorpay Dashboard → Webhooks → secret → backend/.env
RAZORPAY_WEBHOOK_SECRET='whsec_...'
```

---

## P0-PAY — Payments

### P0-PAY1 — Live keys (Biz/Ops)

```bash
RAZORPAY_KEY_ID='rzp_live_...'
RAZORPAY_KEY_SECRET='...'
GARUD_DEPLOY_ENV=production
```

### P0-PAY2 — Webhook URL

Register: `https://garudhub.me/platform-api/v1/payments/webhook` (or API hostname).

### P0-PAY3 / P0-PAY4 — Staging smoke & go-live checklist

Follow [STAGING_SMOKE_CHECKLIST.md](./STAGING_SMOKE_CHECKLIST.md) and [PAYMENTS_RUNBOOK.md](./PAYMENTS_RUNBOOK.md) §3 on `dev.garudhub.me`.

### P0-PAY5 — Staging deploy env

```bash
echo 'GARUD_DEPLOY_ENV=staging' >> ~/Garud/backend/.env   # test keys only
```

---

## P0-F — Uploads

### P0-F1 — Persistent `UPLOAD_DIR`

```bash
mkdir -p /var/lib/garudhub/uploads
echo 'UPLOAD_DIR=/var/lib/garudhub/uploads' >> ~/Garud/backend/.env
# Mount volume in compose or bind-mount in systemd unit
```

### P0-F2 — Upload backup policy

```bash
# Option A: tar uploads with DB backup
tar czf ~/backups/garud-uploads-$(date +%F).tar.gz /var/lib/garudhub/uploads
# Option B: accept re-upload for MVP — document in PRODUCTION_READINESS risk table
```

---

## P0-M / P0-G — Monitoring & release

### P0-M2 — Log retention

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 14
# Cloudflare → Analytics → HTTP 5xx for garudhub.me / dev.garudhub.me
```

### P0-G1 / P0-G3 — Branch policy & prod deploy

```bash
# Staging: deploy/scripts/remote-deploy-dev.sh (branch dev)
# Production: merge dev → main, then:
bash deploy/scripts/remote-deploy-prod.sh
```

### NEXT-L1 — Production env bundle

Ensure on host `backend/.env`: SMTP_*, `ADMIN_NOTIFY_EMAIL`, `PUBLIC_APP_URL`, Razorpay, `CRM_WEBHOOK_*` (if used), `SENTRY_DSN` (optional).

### NEXT-L2 / NEXT-L4 — Smoke

Execute [STAGING_SMOKE_CHECKLIST.md](./STAGING_SMOKE_CHECKLIST.md) then a small live payment on prod.

### NEXT-L3 — Merge dev → main

```bash
git checkout main && git pull && git merge origin/dev && git push origin main
bash deploy/scripts/remote-deploy-prod.sh
```

### NEXT-L5 — Support runbook (x-request-id)

```bash
pm2 logs garudhub-api-prod --lines 200 | grep 'YOUR_REQUEST_ID'
# JSON logs include requestId field when LOG_FORMAT=json
```

---

## P1 ops (non-blocking)

| ID | Action |
|----|--------|
| P1-3 | Only if exposing `api.garudhub.me` — set CORS_ORIGINS on API |
| P1-5 | Migrate to Neon/RDS; update DATABASE_URL |
| P1-7 | Set SENTRY_DSN + external uptime ping on `/api/v1/health` |
| P1-8 | [PAYMENTS_RUNBOOK.md](./PAYMENTS_RUNBOOK.md) §4–5 live subscription proof |
| NEXT-H1 | Tune THROTTLE_* from 429 telemetry |
| NEXT-H2 | Monitor SMTP bounces at provider |

---

## Product deferrals (doc-only)

| ID | Note |
|----|------|
| NEXT-P7 | Tender bid vault — design in FINAL_PRD_AUDIT §F |
| NEXT-P8 | Analytics dedupe + CSV — partner export backlog |
| NEXT-B1/B2 | COD — **blocked on Biz decision** |
| NEXT-B3 | GST invoices — Biz + Dev sprint |
