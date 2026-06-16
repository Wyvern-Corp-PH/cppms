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

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is not installed" >&2
  exit 1
fi

docker compose version >/dev/null 2>&1 || {
  echo "docker compose plugin is not available" >&2
  exit 1
}

echo "Validating compose config..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config >/dev/null

echo "Building and starting stack..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build --remove-orphans

echo "Pruning dangling images..."
docker image prune -f >/dev/null || true

echo "Service status:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
