#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-.}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
STATE_DIR=".deploy"
PREVIOUS_TAG_FILE="${STATE_DIR}/previous-image-tag"

cd "$APP_DIR"

if [[ ! -f "$PREVIOUS_TAG_FILE" ]]; then
  echo "No previous-image-tag recorded — cannot roll back automatically." >&2
  exit 1
fi

previous_tag=$(tr -d '[:space:]' < "$PREVIOUS_TAG_FILE")
if [[ -z "$previous_tag" ]]; then
  echo "previous-image-tag is empty." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

current_tag=$(grep '^IMAGE_TAG=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')
if [[ "$current_tag" == "$previous_tag" ]]; then
  echo "Already on previous tag $previous_tag — nothing to roll back."
  exit 0
fi

echo "Rolling back IMAGE_TAG: $current_tag -> $previous_tag"
if grep -q '^IMAGE_TAG=' "$ENV_FILE"; then
  sed -i.bak "s|^IMAGE_TAG=.*|IMAGE_TAG=${previous_tag}|" "$ENV_FILE"
else
  printf '\nIMAGE_TAG=%s\n' "$previous_tag" >> "$ENV_FILE"
fi

bash "$(dirname "$0")/deploy-remote.sh" "$APP_DIR"
bash "$(dirname "$0")/deploy-smoke-test.sh"

echo "Rollback complete on tag $previous_tag"
