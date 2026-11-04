#!/usr/bin/env bash
# Run on the staging host (dev branch) after SSH from deploy-dev.yml or manually.
set -euo pipefail

APP_DIR="${GARUD_APP_DIR:-$HOME/Garud}"
BRANCH="${DEPLOY_REF:-dev}"

echo "==> GarudHub dev deploy in $APP_DIR (ref: $BRANCH)"

cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "==> Postgres (docker compose)"
docker compose up -d

echo "==> Backend"
cd "$APP_DIR/backend"
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run build

echo "==> Frontend"
cd "$APP_DIR/frontend"
npm ci
npm run build

echo "==> Restart app processes (customize for your host)"
# pm2 — adjust names/paths to match your setup
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart garudhub-api 2>/dev/null || pm2 start npm --name garudhub-api --cwd "$APP_DIR/backend" -- run start:prod
  pm2 restart garudhub-web 2>/dev/null || pm2 start npm --name garudhub-web --cwd "$APP_DIR/frontend" -- run start
  pm2 save || true
else
  echo "pm2 not found — restart Nest (port 3000) and Next (port 3001) via systemd/launchd, then cloudflared."
fi

echo "==> Post-deploy health"
if [[ -x "$APP_DIR/deploy/scripts/post-deploy-health-check.sh" ]]; then
  BASE_URL="${GARUD_PUBLIC_URL:-https://dev.garudhub.me}" "$APP_DIR/deploy/scripts/post-deploy-health-check.sh" || true
fi
echo "==> Smoke: ensure cloudflared tunnel points to http://127.0.0.1:3001"
echo "    https://dev.garudhub.me/marketplace?section=drones"
echo "    Full checklist: docs/STAGING_SMOKE_CHECKLIST.md"
echo "    Production host script: deploy/scripts/remote-deploy-prod.sh"
