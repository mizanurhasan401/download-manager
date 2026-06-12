#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/home/deploy/download-manager}"
DEPLOY_DIR="${APP_ROOT}/deploy"
SITE_DOMAIN="${SITE_DOMAIN:-downloadvideos.work.gd}"
SERVER_IP="${SERVER_IP:-84.247.191.28}"
PUBLIC_URL="${PUBLIC_URL:-https://${SITE_DOMAIN}}"

log() { echo "[deploy] $*"; }
die() { echo "[deploy] ERROR: $*" >&2; exit 1; }

normalize_public_url() {
  local url="${1}"
  url="${url%/}"
  if [[ "${url}" != http*://* ]]; then
    url="https://${url}"
  fi
  echo "${url}"
}

PUBLIC_URL="$(normalize_public_url "${PUBLIC_URL}")"
SITE_DOMAIN="${SITE_DOMAIN:-${PUBLIC_URL#https://}}"
SITE_DOMAIN="${SITE_DOMAIN#http://}"
SITE_DOMAIN="${SITE_DOMAIN%%/*}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

install_system_packages() {
  log "Installing system packages..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq \
    curl \
    ca-certificates \
    gnupg \
    ffmpeg \
    libreoffice \
    python3 \
    python3-pip \
    build-essential \
    >/dev/null

  if ! command -v yt-dlp >/dev/null 2>&1; then
    pip3 install --break-system-packages yt-dlp >/dev/null 2>&1 \
      || pip3 install yt-dlp >/dev/null
  else
    log "Upgrading yt-dlp..."
    pip3 install --break-system-packages -U yt-dlp >/dev/null 2>&1 \
      || pip3 install -U yt-dlp >/dev/null
  fi
}

install_node() {
  if command -v node >/dev/null 2>&1 && [[ "$(node -v | cut -d. -f1 | tr -d v)" -ge 22 ]]; then
    log "Node.js already installed: $(node -v)"
  else
    log "Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y -qq nodejs
  fi

  corepack enable
  corepack prepare pnpm@11.2.2 --activate
  log "pnpm $(pnpm --version)"
}

start_docker_services() {
  log "Starting Postgres and Redis..."
  cd "${DEPLOY_DIR}"

  if docker ps --format '{{.Names}}' | grep -qx 'download-manager-postgres' \
    && docker ps --format '{{.Names}}' | grep -qx 'download-manager-redis'; then
    log "Postgres and Redis containers already running"
  else
    docker compose -f docker-compose.prod.yml up -d
  fi

  log "Waiting for Postgres..."
  for _ in $(seq 1 30); do
    if docker exec download-manager-postgres pg_isready -U download_manager -d download_manager >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done

  docker exec download-manager-postgres pg_isready -U download_manager -d download_manager \
    || die "Postgres failed to start"

  log "Ensuring extra databases exist..."
  docker exec -i download-manager-postgres psql -U download_manager -d download_manager \
    < "${DEPLOY_DIR}/init-databases.sql" >/dev/null 2>&1 || true
}

install_env_files() {
  log "Installing environment files..."
  cp "${DEPLOY_DIR}/env/api.env" "${APP_ROOT}/api/.env.development"
  cp "${DEPLOY_DIR}/env/file-converter.env" "${APP_ROOT}/file-converter/.env.development"
  cp "${DEPLOY_DIR}/env/image-api.env" "${APP_ROOT}/image-api/.env.development"

  sed -e "s|https://downloadvideos.work.gd|${PUBLIC_URL}|g" \
      -e "s|http://downloadvideos.work.gd|${PUBLIC_URL}|g" \
      "${DEPLOY_DIR}/env/web.env" \
      > "${APP_ROOT}/web/.env.production"

  log "Web env written for ${PUBLIC_URL}"
}

build_services() {
  export CI=true

  log "Building API..."
  cd "${APP_ROOT}/api"
  pnpm install --frozen-lockfile
  pnpm run prisma:migrate:prod
  pnpm run build
  mkdir -p storage/videos storage/audio storage/thumbnails storage/temp storage/merged

  log "Building file-converter..."
  cd "${APP_ROOT}/file-converter"
  pnpm install --frozen-lockfile
  set -a && source .env.development && set +a
  pnpm run prisma:migrate:prod
  pnpm run build
  mkdir -p storage

  log "Building image-api..."
  cd "${APP_ROOT}/image-api"
  pnpm install --frozen-lockfile
  set -a && source .env.development && set +a
  pnpm run prisma:migrate:prod
  pnpm run build
  mkdir -p storage

  log "Building web frontend..."
  cd "${APP_ROOT}/web"
  pnpm install
  pnpm run build
}

configure_nginx() {
  log "Configuring Nginx for ${SITE_DOMAIN}..."

  local nginx_src="${DEPLOY_DIR}/nginx/download-manager.conf"
  if [[ ! -f "/etc/letsencrypt/live/${SITE_DOMAIN}/fullchain.pem" ]]; then
    nginx_src="${DEPLOY_DIR}/nginx/download-manager.http.conf"
    log "No SSL cert — using HTTP-only config. Run certbot after DNS is live."
  fi

  sed -e "s|downloadvideos.work.gd|${SITE_DOMAIN}|g" \
      -e "s|84.247.191.28|${SERVER_IP}|g" \
      "${nginx_src}" \
      > /etc/nginx/sites-available/download-manager

  ln -sf /etc/nginx/sites-available/download-manager /etc/nginx/sites-enabled/download-manager
  rm -f /etc/nginx/sites-enabled/default

  nginx -t
  systemctl enable nginx
  systemctl reload nginx
}

start_pm2() {
  log "Starting PM2 processes..."
  cd "${APP_ROOT}"
  pm2 delete ecosystem.config.cjs 2>/dev/null || true
  pm2 start "${DEPLOY_DIR}/ecosystem.config.cjs"
  pm2 save
  pm2 startup systemd -u root --hp /root 2>/dev/null | tail -1 | bash || true
}

verify_deployment() {
  log "Verifying services..."
  sleep 5
  curl -sf "http://127.0.0.1:3000/api/v1/health" >/dev/null \
    && log "API health: OK" \
    || log "API health: pending (check pm2 logs dm-api)"
  curl -sf "http://127.0.0.1:3001" >/dev/null \
    && log "Web: OK" \
    || log "Web: pending (check pm2 logs dm-web)"
  curl -sf -H "Host: ${SITE_DOMAIN}" "http://127.0.0.1/api/v1/health" >/dev/null \
    && log "Nginx proxy: OK" \
    || log "Nginx proxy: pending"
}

main() {
  [[ -d "${APP_ROOT}/api" ]] || die "Project not found at ${APP_ROOT}"
  [[ -d "${DEPLOY_DIR}" ]] || die "Deploy folder missing at ${DEPLOY_DIR}"

  require_cmd docker
  require_cmd pm2
  require_cmd nginx

  install_system_packages
  install_node
  start_docker_services
  install_env_files
  build_services
  configure_nginx
  start_pm2
  verify_deployment

  log "Deployment complete."
  log "Site URL: ${PUBLIC_URL}"
  log "Domain: ${SITE_DOMAIN}"
  log "YouTube cookies: see deploy/YOUTUBE-COOKIES.md (set YTDLP_COOKIES_FILE in deploy/env/api.env)"
  log "PM2 status: pm2 status"
}

main "$@"
