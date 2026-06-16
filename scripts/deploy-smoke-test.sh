#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1}"
RETRIES="${2:-12}"
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

health_check() {
  local label="pocketbase health"
  local url="${BASE_URL}/v1/api/health"
  local attempt=1
  local health_json=""
  while (( attempt <= RETRIES )); do
    if health_json=$(curl -fsS --max-time 15 "$url" 2>/dev/null); then
      if printf '%s' "$health_json" | grep -q '"code"[[:space:]]*:[[:space:]]*200'; then
        echo "OK $label ($url)"
        return 0
      fi
      echo "Retry $attempt/$RETRIES: $label (unexpected payload)"
    else
      echo "Retry $attempt/$RETRIES: $label"
    fi
    sleep "$DELAY"
    attempt=$((attempt + 1))
  done
  echo "FAIL $label ($url)" >&2
  [[ -n "$health_json" ]] && echo "Last payload: $health_json" >&2
  return 1
}

health_check
curl_check "public home" "${BASE_URL}/"
curl_check "admin login" "${BASE_URL}/admin/login"

echo "All smoke checks passed."
