#!/usr/bin/env bash
# PostgreSQL backup template for GarudHub hosts (P0-D3 / P1-5).
# Copy to the server, set DATABASE_URL, schedule via cron or systemd timer.
#
# Example cron (daily 02:15 UTC):
#   15 2 * * * GARUD_APP_DIR=$HOME/Garud DATABASE_URL='postgresql://...' $HOME/Garud/deploy/scripts/pg-backup.sh
#
# Requires: pg_dump on PATH (postgres client tools).
set -euo pipefail

APP_DIR="${GARUD_APP_DIR:-$HOME/Garud}"
BACKUP_DIR="${GARUD_PG_BACKUP_DIR:-$APP_DIR/backups/postgres}"
RETAIN_DAYS="${GARUD_PG_BACKUP_RETAIN_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/garudhub_${STAMP}.sql.gz"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "==> pg_dump → $OUT"
pg_dump "$DATABASE_URL" --no-owner --no-acl | gzip -9 > "$OUT"

echo "==> Prune backups older than ${RETAIN_DAYS} days"
find "$BACKUP_DIR" -name 'garudhub_*.sql.gz' -mtime +"$RETAIN_DAYS" -delete 2>/dev/null || true

echo "==> Done ($(du -h "$OUT" | awk '{print $1}'))"
echo "    Restore drill: gunzip -c $OUT | psql \"\$TARGET_DATABASE_URL\""
