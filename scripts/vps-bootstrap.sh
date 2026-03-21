#!/usr/bin/env bash
# One-shot Ubuntu VPS setup: Docker, clone BoggersTheAI-Dev, .env + token, compose up, Ollama pulls, verify.
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/BoggersTheFish/BoggersTheAI-Dev/main/scripts/vps-bootstrap.sh | sudo bash
#   sudo bash scripts/vps-bootstrap.sh --domain boggersthefish.com --tls
# Env overrides: REPO_URL, INSTALL_DIR, BRANCH, PUBLIC_ORIGIN (same as --domain https form optional)

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

REPO_URL="${REPO_URL:-https://github.com/BoggersTheFish/BoggersTheAI-Dev.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/BoggersTheAI-Dev}"
BRANCH="${BRANCH:-main}"
WITH_TLS=0
DOMAIN_HOST=""

usage() {
  cat <<'EOF'
BoggersTheAI-Dev — Ubuntu VPS bootstrap (Docker + compose + Ollama models + verify).

Options:
  --dir PATH          Install/clone directory (default: /opt/BoggersTheAI-Dev)
  --domain HOST       Public site hostname without scheme, e.g. boggersthefish.com
                      Sets BOGGERS_CORS_ORIGINS and (with --tls) CADDY_DOMAIN.
  --tls               After stack is healthy, start Caddy (profile tls). Needs --domain.
  --branch NAME       Git branch (default: main)
  --repo URL          Git clone URL
  -h, --help          This help

Examples:
  sudo bash scripts/vps-bootstrap.sh
  sudo bash scripts/vps-bootstrap.sh --domain boggersthefish.com
  sudo bash scripts/vps-bootstrap.sh --domain boggersthefish.com --tls
EOF
}

while [[ $# -gt 0 ]]; do
  case "${1:-}" in
    --dir) INSTALL_DIR="${2:?}"; shift 2 ;;
    --domain) DOMAIN_HOST="${2:?}"; shift 2 ;;
    --tls) WITH_TLS=1; shift ;;
    --branch) BRANCH="${2:?}"; shift 2 ;;
    --repo) REPO_URL="${2:?}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ "$WITH_TLS" -eq 1 && -z "$DOMAIN_HOST" ]]; then
  echo "error: --tls requires --domain your.hostname" >&2
  exit 1
fi

log() { echo "==> $*"; }

require_root_for_docker_install() {
  if [[ "${EUID:-0}" -ne 0 ]] && ! command -v docker >/dev/null 2>&1; then
    echo "Docker is not installed and this script is not running as root." >&2
    echo "Run: curl -fsSL .../vps-bootstrap.sh | sudo bash" >&2
    exit 1
  fi
}

ensure_ubuntu() {
  if [[ -f /etc/os-release ]]; then
    # shellcheck source=/dev/null
    . /etc/os-release
    if [[ "${ID:-}" != "ubuntu" ]]; then
      echo "warning: tested on Ubuntu; continuing anyway ($PRETTY_NAME)" >&2
    fi
  fi
}

install_docker_if_needed() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log "Docker + Compose already present"
    return 0
  fi
  if [[ "${EUID:-0}" -ne 0 ]]; then
    require_root_for_docker_install
    return 0
  fi
  log "Installing Docker Engine (get.docker.com)"
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sh /tmp/get-docker.sh
  rm -f /tmp/get-docker.sh
  systemctl enable docker >/dev/null 2>&1 || true
  systemctl start docker
  if [[ -n "${SUDO_USER:-}" ]]; then
    usermod -aG docker "$SUDO_USER" || true
    log "Added $SUDO_USER to group docker (log out/in for passwordless docker)"
  fi
}

install_git_if_needed() {
  if command -v git >/dev/null 2>&1; then
    return 0
  fi
  if [[ "${EUID:-0}" -ne 0 ]]; then
    echo "error: git is not installed; install with: sudo apt-get update && sudo apt-get install -y git" >&2
    exit 1
  fi
  log "Installing git"
  apt-get update -qq
  apt-get install -y git
}

ensure_openssl() {
  if command -v openssl >/dev/null 2>&1; then
    return 0
  fi
  if [[ "${EUID:-0}" -eq 0 ]]; then
    apt-get install -y openssl
  else
    echo "error: openssl not found" >&2
    exit 1
  fi
}

clone_or_update_repo() {
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    log "Updating repo at $INSTALL_DIR"
    git -C "$INSTALL_DIR" fetch --depth 1 origin "$BRANCH"
    git -C "$INSTALL_DIR" reset --hard "origin/$BRANCH"
  elif [[ -e "$INSTALL_DIR" ]]; then
    echo "error: $INSTALL_DIR exists but is not a git clone; move it aside or use --dir" >&2
    exit 1
  else
    log "Cloning $REPO_URL → $INSTALL_DIR (branch $BRANCH)"
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone --depth 1 -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
  fi
}

ensure_env_file() {
  local root="$1"
  cd "$root"
  if [[ ! -f .env ]]; then
    log "Creating .env from .env.example"
    cp .env.example .env
  fi
  # Shared secret for backend + Next proxy (must match)
  if ! grep -qE '^BOGGERS_DASHBOARD_TOKEN=.+' .env; then
    local tok
    tok="$(openssl rand -hex 32)"
    log "Setting BOGGERS_DASHBOARD_TOKEN"
    if grep -qE '^BOGGERS_DASHBOARD_TOKEN=' .env; then
      sed -i.bak "s/^BOGGERS_DASHBOARD_TOKEN=.*/BOGGERS_DASHBOARD_TOKEN=${tok}/" .env
    else
      echo "BOGGERS_DASHBOARD_TOKEN=${tok}" >> .env
    fi
  fi
  # CORS: include public origins when domain is known (direct API access / tooling)
  if [[ -n "$DOMAIN_HOST" ]]; then
    local origins="https://${DOMAIN_HOST},https://www.${DOMAIN_HOST},http://localhost:3000,http://127.0.0.1:3000"
    log "Setting BOGGERS_CORS_ORIGINS for ${DOMAIN_HOST}"
    if grep -qE '^BOGGERS_CORS_ORIGINS=' .env; then
      sed -i.bak2 "s|^BOGGERS_CORS_ORIGINS=.*|BOGGERS_CORS_ORIGINS=${origins}|" .env
    else
      echo "BOGGERS_CORS_ORIGINS=${origins}" >> .env
    fi
    if [[ "$WITH_TLS" -eq 1 ]]; then
      log "Setting CADDY_DOMAIN for TLS profile"
      if grep -qE '^CADDY_DOMAIN=' .env; then
        sed -i.bak3 "s/^CADDY_DOMAIN=.*/CADDY_DOMAIN=${DOMAIN_HOST}/" .env
      else
        echo "CADDY_DOMAIN=${DOMAIN_HOST}" >> .env
      fi
    fi
  fi
  # shellcheck source=/dev/null
  set -a && source .env && set +a
}

wait_for_http() {
  local url="$1"
  local name="$2"
  local max="${3:-90}"
  local i=0
  while [[ $i -lt $max ]]; do
    if curl -sf --max-time 4 "$url" >/dev/null 2>&1; then
      log "$name reachable"
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  echo "error: timeout waiting for $name ($url)" >&2
  return 1
}

compose_up() {
  local root="$1"
  cd "$root"
  log "docker compose build"
  docker compose build
  log "docker compose up -d"
  docker compose up -d
}

pull_ollama_models() {
  local root="$1"
  cd "$root"
  log "Waiting for Ollama container"
  local i=0
  while [[ $i -lt 45 ]]; do
    if docker compose exec -T ollama ollama list >/dev/null 2>&1; then
      break
    fi
    i=$((i + 1))
    sleep 2
  done
  log "Pulling Ollama models (matches config.docker.yaml)"
  docker compose exec -T ollama ollama pull llama3.2 || true
  docker compose exec -T ollama ollama pull nomic-embed-text || true
}

maybe_tls() {
  local root="$1"
  if [[ "$WITH_TLS" -ne 1 ]]; then
    return 0
  fi
  cd "$root"
  log "Starting Caddy (TLS profile)"
  docker compose --profile tls up -d
}

# --- main ---
ensure_ubuntu
if [[ "${EUID:-0}" -ne 0 ]] && [[ "$INSTALL_DIR" == /opt/* ]]; then
  echo "error: default install dir $INSTALL_DIR needs root. Run: sudo bash ..." >&2
  echo "       Or: INSTALL_DIR=\$HOME/BoggersTheAI-Dev bash ..." >&2
  exit 1
fi
require_root_for_docker_install

install_docker_if_needed
install_git_if_needed
ensure_openssl

# Re-exec with docker available if we just installed and user is not root
if [[ "${EUID:-0}" -ne 0 ]] && ! docker info >/dev/null 2>&1; then
  echo "error: cannot use Docker. If Docker was just installed, log out and back in, or run: newgrp docker" >&2
  exit 1
fi

clone_or_update_repo "$INSTALL_DIR"
ensure_env_file "$INSTALL_DIR"
compose_up "$INSTALL_DIR"

wait_for_http "http://127.0.0.1:8000/health/live" "Backend" 90
wait_for_http "http://127.0.0.1:3000/" "Frontend" 90

pull_ollama_models "$INSTALL_DIR"
maybe_tls "$INSTALL_DIR"

cd "$INSTALL_DIR"
if [[ -f .env ]]; then
  # shellcheck source=/dev/null
  set -a && source .env && set +a
fi
log "Running scripts/verify-stack.sh"
set +e
bash scripts/verify-stack.sh
VERIFY=$?
set -e

echo ""
log "Bootstrap finished (verify exit code: $VERIFY)"
echo "  Site UI:     http://127.0.0.1:3000"
echo "  Lab:         http://127.0.0.1:3000/lab"
if [[ -n "${BOGGERS_DASHBOARD_TOKEN:-}" ]]; then
  echo "  Token (save securely): ${BOGGERS_DASHBOARD_TOKEN:0:8}... (full value in ${INSTALL_DIR}/.env)"
fi
if [[ "$WITH_TLS" -eq 1 ]]; then
  echo "  HTTPS:       https://${DOMAIN_HOST}/"
fi
echo "  Optional:    bash scripts/backup-volumes.sh ./backups"
if [[ -n "${SUDO_USER:-}" && -d "$INSTALL_DIR" ]]; then
  chown -R "$SUDO_USER:$SUDO_USER" "$INSTALL_DIR" || true
  log "Repository ownership set to $SUDO_USER (edit .env without sudo)"
fi
exit "$VERIFY"
