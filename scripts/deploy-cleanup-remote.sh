#!/usr/bin/env bash
# Prune stale cppms GHCR images and unused Docker artifacts on EC2.
set -euo pipefail

APP_DIR="${1:-.}"
KEEP_TAGS="${2:-3}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
STATE_DIR=".deploy"

cd "$APP_DIR"

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

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

declare -A keep_set=()
add_keep() {
  local tag="$1"
  [[ -n "$tag" && "$tag" != "dev" ]] && keep_set["$tag"]=1
}

add_keep "${IMAGE_TAG:-}"
[[ -f "${STATE_DIR}/current-image-tag" ]] && add_keep "$(tr -d '[:space:]' < "${STATE_DIR}/current-image-tag")"
[[ -f "${STATE_DIR}/previous-image-tag" ]] && add_keep "$(tr -d '[:space:]' < "${STATE_DIR}/previous-image-tag")"

if [[ -n "${GHCR_REGISTRY:-}" ]]; then
  for repo in cppms-pocketbase cppms-public-frontend cppms-admin-frontend; do
    image_ref="${GHCR_REGISTRY}/${repo}"
    mapfile -t recent_tags < <(
      docker_cmd images "$image_ref" --format '{{.Tag}}' 2>/dev/null | grep -v '^latest$' | head -n "$KEEP_TAGS" || true
    )
    for tag in "${recent_tags[@]}"; do
      add_keep "$tag"
    done
  done
fi

echo "Keeping image tags: ${!keep_set[*]:-<none>}"

if [[ -n "${GHCR_REGISTRY:-}" ]]; then
  for repo in cppms-pocketbase cppms-public-frontend cppms-admin-frontend; do
    image_ref="${GHCR_REGISTRY}/${repo}"
    mapfile -t all_tags < <(docker_cmd images "$image_ref" --format '{{.Tag}}' 2>/dev/null || true)
    for tag in "${all_tags[@]}"; do
      [[ -z "$tag" || "$tag" == "<none>" ]] && continue
      if [[ -z "${keep_set[$tag]:-}" ]]; then
        echo "Removing old image ${image_ref}:${tag}"
        docker_cmd rmi "${image_ref}:${tag}" 2>/dev/null || true
      fi
    done
  done
fi

echo "Pruning dangling images..."
docker_cmd image prune -f >/dev/null || true

echo "Pruning unused build cache..."
docker_cmd builder prune -af --filter "until=72h" >/dev/null 2>&1 \
  || docker_cmd builder prune -f >/dev/null 2>&1 \
  || true

echo "Docker disk usage:"
docker_cmd system df || true
