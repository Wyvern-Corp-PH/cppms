#!/usr/bin/env bash
# Retain the newest N pre_deploy PocketBase backups (API + host copies).
set -euo pipefail

APP_DIR="${1:-.}"
KEEP="${2:-5}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"

cd "$APP_DIR"

[[ -f "$ENV_FILE" ]] || exit 0

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

docker_cmd() {
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    docker "$@"
    return
  fi
  sudo docker "$@"
}

json_field() {
  local json="$1"
  local field="$2"
  if command -v python3 >/dev/null 2>&1; then
    JSON="$json" FIELD="$field" python3 - <<'PY'
import json, os
data = json.loads(os.environ["JSON"])
print(data[os.environ["FIELD"]])
PY
    return
  fi
  printf '%s' "$json" | sed -n "s/.*\"${field}\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" | head -1
}

auth_body() {
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY'
import json, os
print(json.dumps({
    "identity": os.environ["POCKETBASE_ADMIN_EMAIL"],
    "password": os.environ["POCKETBASE_ADMIN_PASSWORD"],
}))
PY
    return
  fi
  printf '{"identity":"%s","password":"%s"}' \
    "${POCKETBASE_ADMIN_EMAIL//\"/\\\"}" \
    "${POCKETBASE_ADMIN_PASSWORD//\"/\\\"}"
}

pb_container() {
  docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q pocketbase
}

pb_curl() {
  local cid="$1"
  shift
  docker_cmd run --rm --network "container:${cid}" curlimages/curl:8.12.1 -fsS "$@"
}

if ! docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps pocketbase 2>/dev/null \
  | grep -qE 'running|healthy'; then
  exit 0
fi

cid=$(pb_container)
[[ -n "$cid" ]] || exit 0

auth_json=$(pb_curl "$cid" \
  -X POST "http://127.0.0.1:8090/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "$(auth_body)")
token=$(json_field "$auth_json" token)
[[ -n "$token" ]] || exit 0

list_json=$(pb_curl "$cid" -H "Authorization: ${token}" "http://127.0.0.1:8090/api/backups")
mapfile -t keys < <(printf '%s' "$list_json" | sed -n 's/.*"key"[[:space:]]*:[[:space:]]*"\(pre_deploy[^"]*\)".*/\1/p' | sort -r)

if ((${#keys[@]} <= KEEP)); then
  echo "Nothing to prune (${#keys[@]} pre_deploy backup(s))."
  exit 0
fi

for (( i=KEEP; i<${#keys[@]}; i++ )); do
  key="${keys[$i]}"
  echo "Deleting old backup: $key"
  pb_curl "$cid" -X DELETE -H "Authorization: ${token}" \
    "http://127.0.0.1:8090/api/backups/${key}" -o /dev/null || true
  rm -f ".deploy/backups/${key}" 2>/dev/null || true
done

echo "Pruned to ${KEEP} newest pre_deploy backup(s)."
