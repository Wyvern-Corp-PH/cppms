#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-.}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"

cd "$APP_DIR"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing $COMPOSE_FILE in $APP_DIR" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE in $APP_DIR" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

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

docker_cmd compose version >/dev/null 2>&1 || {
  echo "docker compose plugin is not available" >&2
  exit 1
}

APP_SERVICES=(pocketbase public-frontend admin-frontend caddy)
PULL_ONLY=false
if [[ -n "${IMAGE_TAG:-}" && "${IMAGE_TAG}" != "dev" && -n "${GHCR_REGISTRY:-}" ]]; then
  PULL_ONLY=true
fi

STATE_DIR=".deploy"
CADDYFILE_PATH="docker/caddy/Caddyfile.prod"
CADDYFILE_HASH_FILE="${STATE_DIR}/caddyfile.sha256"

caddyfile_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$CADDYFILE_PATH" | awk '{print $1}'
    return
  fi
  sha256 -q "$CADDYFILE_PATH"
}

reset_caddy_state_if_caddyfile_changed() {
  if [[ ! -f "$CADDYFILE_PATH" ]]; then
    echo "[deploy] missing $CADDYFILE_PATH; skipping caddy volume reset check" >&2
    return 0
  fi

  mkdir -p "$STATE_DIR"
  local new_hash old_hash
  new_hash="$(caddyfile_sha256)"
  old_hash=""
  if [[ -f "$CADDYFILE_HASH_FILE" ]]; then
    old_hash="$(tr -d '[:space:]' < "$CADDYFILE_HASH_FILE")"
  fi

  if [[ "$new_hash" == "$old_hash" ]]; then
    echo "[deploy] Caddyfile unchanged (${new_hash:0:12}...); keeping caddy volumes"
    return 0
  fi

  echo "[deploy] Caddyfile changed (${old_hash:-none} -> ${new_hash:0:12}...); resetting caddy data/config volumes..."
  docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop caddy >/dev/null 2>&1 || true
  docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" rm -f caddy >/dev/null 2>&1 || true
  docker_cmd volume rm -f cppms_caddy_data cppms_caddy_config >/dev/null 2>&1 || true
  printf '%s\n' "$new_hash" > "${CADDYFILE_HASH_FILE}.pending"
}

dump_stack_diagnostics() {
  echo "--- docker compose ps ---"
  docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -a 2>&1 || true
  for svc in pocketbase public-frontend admin-frontend caddy; do
    echo "--- logs: ${svc} (last 40 lines) ---"
    docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --no-color --tail=40 "$svc" 2>&1 || true
  done
}

WAIT_TIMEOUT="${DEPLOY_WAIT_TIMEOUT_SEC:-420}"
CADDY_PORT="${CADDY_HTTP_PORT:-80}"

reset_caddy_state_if_caddyfile_changed

wait_for_http() {
  local url="$1"
  local timeout_sec="${2:-90}"
  local deadline=$((SECONDS + timeout_sec))
  echo "[deploy] waiting for HTTP at $url (timeout ${timeout_sec}s)..."
  while (( SECONDS < deadline )); do
    if curl -fsS --max-time 5 "$url" >/dev/null 2>&1; then
      echo "[deploy] HTTP ready at $url"
      return 0
    fi
    sleep 2
  done
  echo "[deploy] timed out waiting for HTTP at $url" >&2
  return 1
}

if [[ "$PULL_ONLY" == "false" ]]; then
  echo "[deploy] validating compose config..."
  docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config >/dev/null
  echo "[deploy] building and starting stack..."
  docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build --remove-orphans --force-recreate
else
  echo "[deploy] pulling images ${GHCR_REGISTRY}/cppms-*:${IMAGE_TAG}..."
  docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull "${APP_SERVICES[@]}"
  echo "[deploy] starting stack (pull-only, wait timeout ${WAIT_TIMEOUT}s)..."
  if docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --help 2>&1 | grep -q '\-\-wait'; then
    if docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
      up -d --remove-orphans --force-recreate --wait --wait-timeout "$WAIT_TIMEOUT"; then
      echo "[deploy] compose --wait finished"
    else
      echo "[deploy] compose --wait failed or timed out after ${WAIT_TIMEOUT}s" >&2
      dump_stack_diagnostics
      exit 1
    fi
  else
    docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans --force-recreate
    echo "[deploy] waiting up to ${WAIT_TIMEOUT}s for healthchecks (no compose --wait)..."
    deadline=$((SECONDS + WAIT_TIMEOUT))
    while (( SECONDS < deadline )); do
      unhealthy=$(docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps --format json 2>/dev/null \
        | grep -c '"Health":"unhealthy"' || true)
      starting=$(docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps --format json 2>/dev/null \
        | grep -cE '"Health":"starting"|"State":"starting"' || true)
      if [[ "$unhealthy" -eq 0 && "$starting" -eq 0 ]]; then
        running=$(docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps --services --status running 2>/dev/null | wc -l)
        if [[ "$running" -ge 4 ]]; then
          echo "[deploy] all services running"
          break
        fi
      fi
      sleep 5
    done
    if (( SECONDS >= deadline )); then
      echo "[deploy] timed out waiting for services after ${WAIT_TIMEOUT}s" >&2
      dump_stack_diagnostics
      exit 1
    fi
  fi
fi

if ! wait_for_http "http://127.0.0.1:${CADDY_PORT}/v1/api/health" 90; then
  dump_stack_diagnostics
  exit 1
fi

mkdir -p "$STATE_DIR"
if [[ -n "${IMAGE_TAG:-}" ]]; then
  printf '%s\n' "$IMAGE_TAG" > "${STATE_DIR}/current-image-tag"
fi
if [[ -f "${CADDYFILE_HASH_FILE}.pending" ]]; then
  mv "${CADDYFILE_HASH_FILE}.pending" "$CADDYFILE_HASH_FILE"
elif [[ -f "$CADDYFILE_PATH" && ! -f "$CADDYFILE_HASH_FILE" ]]; then
  caddyfile_sha256 > "$CADDYFILE_HASH_FILE"
fi

echo "Pruning dangling images..."
docker_cmd image prune -f >/dev/null || true

echo "Service status:"
docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
