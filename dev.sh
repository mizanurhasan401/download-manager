#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${ROOT}/docker-compose.yml"
INIT_SQL="${ROOT}/deploy/init-databases.sql"

log() { printf '\033[1;34m[dev]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[dev]\033[0m %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

ensure_ytdlp() {
  local bin="${ROOT}/video-api/bin/yt-dlp"
  if [[ -x "${bin}" ]] && "${bin}" --version >/dev/null 2>&1; then
    return
  fi

  log "Installing yt-dlp standalone binary..."
  (cd "${ROOT}/video-api" && bash scripts/setup-tools.sh)
}

start_infra() {
  log "Starting Postgres and Redis..."
  docker compose -f "${COMPOSE_FILE}" up -d postgres redis

  log "Waiting for Postgres..."
  for _ in $(seq 1 30); do
    if docker exec download-manager-postgres pg_isready -U download_manager -d download_manager >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  docker exec download-manager-postgres pg_isready -U download_manager -d download_manager \
    || die "Postgres failed to start"

  if [[ -f "${INIT_SQL}" ]]; then
    log "Ensuring file_conversion and image_processing databases exist..."
    docker exec -i download-manager-postgres psql -U download_manager -d download_manager \
      < "${INIT_SQL}" >/dev/null 2>&1 || true
  fi
}

run_migrations() {
  log "Running database migrations..."

  (
    cd "${ROOT}/video-api"
    set -a && source .env.development && set +a
    pnpm prisma:migrate
  )

  (
    cd "${ROOT}/image-api"
    set -a && source .env.development && set +a
    pnpm prisma:migrate
  )

  (
    cd "${ROOT}/converter-api"
    set -a && source .env.development && set +a
    pnpm prisma:migrate
  )
}

PIDS=()

cleanup() {
  log "Stopping app services..."
  for pid in "${PIDS[@]}"; do
    kill "${pid}" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}

run_service() {
  local name=$1
  local dir=$2
  shift 2

  (
    cd "${ROOT}/${dir}"
    exec "$@"
  ) 2>&1 | while IFS= read -r line; do
    printf '[%s] %s\n' "${name}" "${line}"
  done &

  PIDS+=("$!")
}

main() {
  require_cmd docker
  require_cmd pnpm

  start_infra
  ensure_ytdlp
  run_migrations

  trap cleanup EXIT INT TERM

  log "Starting all services (Ctrl+C to stop)..."
  log "  video-api      http://localhost:3000"
  log "  web            http://localhost:3001"
  log "  image-api      http://localhost:3100"
  log "  converter-api  http://localhost:3200"

  run_service video-api         video-api      pnpm start:dev
  run_service video-worker      video-api      pnpm start:worker:dev
  run_service web               web            pnpm dev
  run_service image-api         image-api      pnpm start:dev
  run_service image-worker      image-api      pnpm start:worker:dev
  run_service converter-api     converter-api  pnpm start:dev
  run_service converter-worker  converter-api  pnpm start:worker:dev

  wait
}

main "$@"
