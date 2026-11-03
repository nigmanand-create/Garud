#!/usr/bin/env bash
# Run on the production host (main branch). See docs/PRODUCTION_READINESS.md.
set -euo pipefail

APP_DIR="${GARUD_APP_DIR:-$HOME/Garud}"
BRANCH="${DEPLOY_REF:-main}"

echo "==> GarudHub PRODUCTION deploy in $APP_DIR (ref: $BRANCH)"
echo "    Confirm: strong JWT secrets, live Razorpay, NODE_ENV=production, no demo seed."

cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "==> Postgres"
if [[ -f deploy/docker-compose.prod.example.yml ]]; then
  docker compose -f deploy/docker-compose.prod.example.yml up -d
else
  docker compose up -d
fi

echo "==> Backend"
cd "$APP_DIR/backend"
npm ci
npm run prisma:generate
npx prisma migrate deploy
# Do NOT run prisma:seed in production unless ALLOW_DEMO_SEED=true (one-off staging only).
npm run build

echo "==> Frontend"
cd "$APP_DIR/frontend"
npm ci
npm run build

echo "==> Restart processes"
if command -v pm2 >/dev/null 2>&1; then
  NODE_ENV=production pm2 restart garudhub-api-prod 2>/dev/null || \
    pm2 start npm --name garudhub-api-prod --cwd "$APP_DIR/backend" -- run start:prod
  NODE_ENV=production pm2 restart garudhub-web-prod 2>/dev/null || \
    pm2 start npm --name garudhub-web-prod --cwd "$APP_DIR/frontend" -- run start
  pm2 save || true
else
  echo "pm2 not found — restart Nest :3000 and Next :3001 with NODE_ENV=production (systemd)."
fi

echo "==> Post-deploy smoke: docs/PRODUCTION_READINESS.md § Smoke tests"
echo "    https://garudhub.me (or app.garudhub.me) + Razorpay webhook URL on prod domain"
