#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1}"
RETRIES="${2:-8}"
DELAY="${3:-5}"

curl_check() {
  local label="$1"
  local url="$2"
  local attempt=1
  while (( attempt <= RETRIES )); do
    if curl -fsS --max-time 15 "$url" >/dev/null; then
      echo "OK $label ($url)"
      return 0
    fi
    echo "Retry $attempt/$RETRIES: $label"
    sleep "$DELAY"
    attempt=$((attempt + 1))
  done
  echo "FAIL $label ($url)" >&2
  return 1
}

health_json=$(curl -fsS --max-time 15 "${BASE_URL}/v1/api/health")
printf '%s' "$health_json" | grep -q '"code"[[:space:]]*:[[:space:]]*200' \
  || { echo "PocketBase health payload unexpected: $health_json" >&2; exit 1; }
echo "OK pocketbase health (${BASE_URL}/v1/api/health)"

curl_check "public home" "${BASE_URL}/"
curl_check "admin login" "${BASE_URL}/admin/login"

echo "All smoke checks passed."
