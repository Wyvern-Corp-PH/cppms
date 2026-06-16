#!/usr/bin/env bash
# Pre-deploy PocketBase backup via superuser API (https://pocketbase.io/docs/api-backups/)
set -euo pipefail

APP_DIR="${1:-.}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
BACKUP_PREFIX="${2:-pre_deploy}"
MAX_WAIT_SEC="${3:-300}"

cd "$APP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

STATE_DIR=".deploy"
BACKUP_DIR="${STATE_DIR}/backups"
mkdir -p "$BACKUP_DIR"

docker_cmd() {
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    docker "$@"
    return
  fi
  if command -v docker >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; then
    sudo docker "$@"
    return
  fi
  echo "docker is not installed or not reachable" >&2
  exit 1
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

if [[ ! -s "${STATE_DIR}/current-image-tag" && ! -f "${STATE_DIR}/last-backup.txt" ]]; then
  echo "Fresh deploy — skipping pre-deploy backup (no prior release on this host)."
  exit 0
fi

if ! docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps pocketbase 2>/dev/null \
  | grep -qE 'running|healthy'; then
  echo "PocketBase not running — skipping pre-deploy backup (cold start)."
  exit 0
fi

if [[ -z "${POCKETBASE_ADMIN_EMAIL:-}" || -z "${POCKETBASE_ADMIN_PASSWORD:-}" ]]; then
  echo "POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD are required for backup." >&2
  exit 1
fi

cid=$(pb_container)
[[ -n "$cid" ]] || { echo "PocketBase container id not found." >&2; exit 1; }

auth_json=$(pb_curl "$cid" \
  -X POST "http://127.0.0.1:8090/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "$(auth_body)")

token=$(json_field "$auth_json" token)
if [[ -z "$token" ]]; then
  echo "PocketBase superuser auth failed." >&2
  printf '%s\n' "$auth_json" >&2
  exit 1
fi

deploy_id="${IMAGE_TAG:-unknown}"
deploy_id="${deploy_id:0:12}"
timestamp=$(date -u +%Y%m%d_%H%M%S)
backup_name="pre_deploy_${deploy_id}_${timestamp}.zip"
backup_name=$(printf '%s' "$backup_name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_-]/_/g')

echo "Creating PocketBase backup: $backup_name"
create_http=$(pb_curl "$cid" \
  -X POST "http://127.0.0.1:8090/api/backups" \
  -H "Content-Type: application/json" \
  -H "Authorization: ${token}" \
  -d "{\"name\":\"${backup_name}\"}" \
  -o /dev/null -w '%{http_code}')

if [[ "$create_http" != "204" && "$create_http" != "200" ]]; then
  echo "PocketBase backup create failed (HTTP ${create_http}). Name must match [a-z0-9_-].zip" >&2
  exit 1
fi

deadline=$((SECONDS + MAX_WAIT_SEC))
found=false
while (( SECONDS < deadline )); do
  list_json=$(pb_curl "$cid" \
    -H "Authorization: ${token}" \
    "http://127.0.0.1:8090/api/backups")
  if printf '%s' "$list_json" | grep -q "\"key\"[[:space:]]*:[[:space:]]*\"${backup_name}\""; then
    found=true
    break
  fi
  sleep 5
done

if [[ "$found" != "true" ]]; then
  echo "Timed out waiting for backup $backup_name" >&2
  exit 1
fi

printf '%s\n' "$backup_name" > "${STATE_DIR}/last-backup.txt"
printf '%s\n' "$deploy_id" > "${STATE_DIR}/last-deploy-id.txt"

if docker_cmd cp "${cid}:/pb/pb_data/backups/${backup_name}" "${BACKUP_DIR}/${backup_name}" 2>/dev/null; then
  echo "Copied backup to ${BACKUP_DIR}/${backup_name}"
else
  echo "Backup created in PocketBase volume (host copy skipped)."
fi

echo "Pre-deploy backup ready: $backup_name"
