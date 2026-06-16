#!/usr/bin/env bash
# One-time EC2 host setup (Amazon Linux 2023 / ec2-user).
# Run on the server: curl -fsSL ... | bash  OR  bash scripts/ec2-bootstrap.sh
set -euo pipefail

if [[ "$(id -u)" -eq 0 ]]; then
  SUDO=""
else
  SUDO="sudo"
fi

echo "Installing Docker..."
if ! command -v docker >/dev/null 2>&1; then
  $SUDO dnf install -y docker
  $SUDO systemctl enable --now docker
  $SUDO usermod -aG docker "${USER}"
  echo "Docker installed. Log out and back in so group membership applies."
fi

install_compose_plugin() {
  if $SUDO docker compose version >/dev/null 2>&1; then
    return
  fi

  echo "Installing Docker Compose plugin..."
  $SUDO mkdir -p /usr/local/lib/docker/cli-plugins
  local compose_version
  compose_version="$(
    curl -fsSL https://api.github.com/repos/docker/compose/releases/latest \
      | sed -n 's/.*"tag_name": "\(v[^"]*\)".*/\1/p' \
      | head -n 1
  )"
  $SUDO curl -fsSL \
    "https://github.com/docker/compose/releases/download/${compose_version}/docker-compose-linux-$(uname -m)" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  $SUDO chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
}

buildx_arch() {
  case "$(uname -m)" in
    x86_64) echo amd64 ;;
    aarch64) echo arm64 ;;
    *) echo "$(uname -m)" ;;
  esac
}

install_buildx_plugin() {
  if $SUDO docker buildx version >/dev/null 2>&1; then
    local current
    current="$($SUDO docker buildx version 2>/dev/null | awk '{print $2}' | tr -d v)"
    if [[ -n "$current" ]] && [[ "$(printf '%s\n' "0.17.0" "$current" | sort -V | head -n1)" == "0.17.0" ]]; then
      return
    fi
    echo "Docker Buildx ${current:-unknown} is too old; upgrading..."
  fi

  echo "Installing Docker Buildx plugin..."
  $SUDO mkdir -p /usr/local/lib/docker/cli-plugins
  local buildx_version arch
  buildx_version="$(
    curl -fsSL https://api.github.com/repos/docker/buildx/releases/latest \
      | sed -n 's/.*"tag_name": "\(v[^"]*\)".*/\1/p' \
      | head -n 1
  )"
  arch="$(buildx_arch)"
  $SUDO curl -fsSL \
    "https://github.com/docker/buildx/releases/download/${buildx_version}/buildx-${buildx_version}.linux-${arch}" \
    -o /usr/local/lib/docker/cli-plugins/docker-buildx
  $SUDO chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx
}

install_compose_plugin
install_buildx_plugin

$SUDO docker buildx create --name cppms-builder --use >/dev/null 2>&1 \
  || $SUDO docker buildx use cppms-builder >/dev/null 2>&1 \
  || true
$SUDO docker buildx inspect --bootstrap >/dev/null 2>&1 || true

APP_DIR="${EC2_APP_DIR:-$HOME/cppms}"
mkdir -p "$APP_DIR"
echo "Bootstrap complete. App directory: $APP_DIR"
echo "Ensure security group allows TCP 80 and 443, then push to master to deploy."
