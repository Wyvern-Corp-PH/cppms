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

if ! $SUDO docker compose version >/dev/null 2>&1; then
  echo "Installing Docker Compose plugin..."
  $SUDO mkdir -p /usr/local/lib/docker/cli-plugins
  COMPOSE_VERSION="$(
    curl -fsSL https://api.github.com/repos/docker/compose/releases/latest \
      | sed -n 's/.*"tag_name": "\(v[^"]*\)".*/\1/p' \
      | head -n 1
  )"
  $SUDO curl -fsSL \
    "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  $SUDO chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

APP_DIR="${EC2_APP_DIR:-$HOME/cppms}"
mkdir -p "$APP_DIR"
echo "Bootstrap complete. App directory: $APP_DIR"
echo "Ensure security group allows TCP 80 and 443, then push to master to deploy."
