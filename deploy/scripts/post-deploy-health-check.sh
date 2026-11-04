#!/usr/bin/env bash
# Post-deploy health check (P0-M1). Exit non-zero if API health is not OK.
#
# Usage:
#   ./post-deploy-health-check.sh
#   BASE_URL=https://dev.garudhub.me ./post-deploy-health-check.sh
#   API_HEALTH_URL=http://127.0.0.1:3000/api/v1/health ./post-deploy-health-check.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
API_HEALTH_URL="${API_HEALTH_URL:-${BASE_URL%/}/platform-api/v1/health}"
TIMEOUT_SEC="${HEALTH_CHECK_TIMEOUT_SEC:-30}"
RETRIES="${HEALTH_CHECK_RETRIES:-5}"
SLEEP_SEC="${HEALTH_CHECK_SLEEP_SEC:-3}"

echo "==> GarudHub post-deploy health check"
echo "    URL: $API_HEALTH_URL"

attempt=1
while (( attempt <= RETRIES )); do
  if body="$(curl -fsS --max-time "$TIMEOUT_SEC" "$API_HEALTH_URL" 2>/dev/null)"; then
    if echo "$body" | grep -q '"status"[[:space:]]*:[[:space:]]*"ok"'; then
      echo "OK (attempt $attempt): $body"
      exit 0
    fi
    echo "WARN (attempt $attempt): unexpected body: $body" >&2
  else
    echo "WARN (attempt $attempt): request failed" >&2
  fi
  if (( attempt < RETRIES )); then
    sleep "$SLEEP_SEC"
  fi
  attempt=$((attempt + 1))
done

echo "ERROR: health check failed after $RETRIES attempts" >&2
exit 1
