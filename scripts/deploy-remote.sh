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

APP_SERVICES=(pocketbase public-frontend admin-frontend)
PULL_ONLY=false
if [[ -n "${IMAGE_TAG:-}" && "${IMAGE_TAG}" != "dev" && -n "${GHCR_REGISTRY:-}" ]]; then
  PULL_ONLY=true
fi

if [[ "$PULL_ONLY" == "false" ]]; then
  echo "Validating compose config..."
  docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config >/dev/null
  echo "Building and starting stack..."
  docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build --remove-orphans
else
  echo "Pulling images ${GHCR_REGISTRY}/cppms-*:${IMAGE_TAG}..."
  docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull "${APP_SERVICES[@]}"
  echo "Starting stack (pull-only)..."
  if docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --help 2>&1 | grep -q '\-\-wait'; then
    docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans --wait
  else
    docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans
  fi
fi

STATE_DIR=".deploy"
mkdir -p "$STATE_DIR"
if [[ -n "${IMAGE_TAG:-}" ]]; then
  printf '%s\n' "$IMAGE_TAG" > "${STATE_DIR}/current-image-tag"
fi

echo "Pruning dangling images..."
docker_cmd image prune -f >/dev/null || true

echo "Service status:"
docker_cmd compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
