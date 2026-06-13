# Download Manager

A self-hosted toolbox with three independent services behind a single API
gateway:

- **video-api** — download videos/audio (yt-dlp + ffmpeg)
- **image-api** — convert, resize, and remove image backgrounds (Sharp + ML)
- **converter-api** — convert documents and images (LibreOffice + Sharp)

## Architecture

```
                 ┌──────────────┐
  browser ─────▶ │  Nginx (:80) │  one origin, one /api
                 └──────┬───────┘
        ┌───────────────┼──────────────────────────┐
        ▼               ▼                ▼           ▼
   /  → web      /api/videos →     /api/images →  /api/convert →
   (Next.js)     video-api:3000    image-api:3100 converter-api:3200
                      │                 │              │
                 each service: HTTP process enqueues jobs only
                      │                 │              │
                 video-worker      image-worker   converter-worker
                      └─────────────────┴──────────────┘
                                   │  BullMQ jobs
                          ┌────────┴─────────┐
                     Redis (queue)     PostgreSQL
                                       (3 databases:
                                        download_manager,
                                        image_processing,
                                        file_conversion)
```

Each service splits **HTTP** (validate + enqueue, always responsive) from a
**worker** process (heavy yt-dlp / Sharp / LibreOffice / ML work). Progress
flows worker → Redis → HTTP → SSE, so the API never blocks on a job.

The frontend only ever calls `/api/*`; Nginx (prod) and Next.js rewrites (dev)
route each sub-path to the right service and onto its internal `/api/v1` prefix.

## Layout

```
video-api/       image-api/       converter-api/      web/        deploy/
  src/main.ts      src/main.ts      src/main.ts        (Next.js)    nginx/, env/,
  src/worker.module.ts + src/workers/<x>.worker.ts                  ecosystem.config.cjs
docker-compose.yml   dev.sh
```

## Quick start (Docker — everything in one command)

```bash
docker compose up -d --build
```

Brings up Postgres, Redis, all three HTTP services, their three workers, the web
frontend, and the Nginx gateway. Open http://localhost. Migrations run
automatically on each API container's startup.

Optional DB UI: `docker compose --profile tools up -d adminer` (http://localhost:8080).

## Local development (hot reload)

```bash
./dev.sh
```

Starts Postgres + Redis in Docker, runs migrations, then launches every HTTP
service, every worker, and the web app with watch mode:

| Service        | URL                     |
| -------------- | ----------------------- |
| web            | http://localhost:3001   |
| video-api      | http://localhost:3000   |
| image-api      | http://localhost:3100   |
| converter-api  | http://localhost:3200   |

## API routes (via the gateway)

| Path             | Service        | Internal prefix |
| ---------------- | -------------- | --------------- |
| `/api/videos/*`  | video-api      | `/api/v1/*`     |
| `/api/images/*`  | image-api      | `/api/v1/*`     |
| `/api/convert/*` | converter-api  | `/api/v1/*`     |

## Production deploy (VPS, PM2 + system Nginx)

See [deploy/setup-vps.sh](deploy/setup-vps.sh) and
[deploy/ecosystem.config.cjs](deploy/ecosystem.config.cjs). Extra notes:
[deploy/YOUTUBE-COOKIES.md](deploy/YOUTUBE-COOKIES.md),
[deploy/HEIC-SETUP.md](deploy/HEIC-SETUP.md).
