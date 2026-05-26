# Image Processing Microservice

Standalone NestJS microservice that converts, resizes, and removes the background of images. Runs alongside the video downloader API in the `download-manager` monorepo.

## Features (V1)

- **Convert** between PNG / JPEG / WebP / AVIF (mozjpeg for JPEG, lossless PNG, quality-controlled WebP/AVIF)
- **Resize** to any width × height with `cover` / `contain` / `fill` / `inside` / `outside` fit
- **Remove background** powered by `@imgly/background-removal-node` (pre-warmed on boot)

## Architecture

- **NestJS 11** + Prisma 6 + Postgres (`image_processing` DB, same Postgres instance as the video service)
- **BullMQ** with two queues:
  - `image-fast-ops-queue` (convert + resize) — concurrency `FAST_OPS_CONCURRENCY` (default 5)
  - `image-bg-remove-queue` (background removal) — concurrency `BG_REMOVE_CONCURRENCY` (default 1)
- **Sharp** with decode-once pipelines, EXIF auto-rotate, decompression-bomb guard via `MAX_INPUT_PIXELS`
- Local-disk storage adapter — drop-in replaceable with S3/MinIO later

## Endpoints

| Method | Path                                  | Description                              |
| ------ | ------------------------------------- | ---------------------------------------- |
| POST   | `/api/v1/images/jobs`                 | Upload + create job (multipart)          |
| GET    | `/api/v1/images/jobs`                 | List recent jobs                         |
| GET    | `/api/v1/images/jobs/:id`             | Job status + metadata                    |
| GET    | `/api/v1/images/jobs/:id/file?type=…` | Download original or output              |
| DELETE | `/api/v1/images/jobs/:id`             | Delete job + files                       |
| GET    | `/api/v1/health`                      | Health check (DB + Redis + storage)      |
| GET    | `/docs`                               | Swagger UI                               |

## Quick start

```bash
# 1. Make sure the existing Postgres + Redis are running:
#    (from the project root)
docker compose -f api/docker-compose.yml up -d postgres redis

# 2. Create the dedicated database (one-time):
docker exec -it download-manager-postgres \
  psql -U download_manager -d download_manager \
  -c "CREATE DATABASE image_processing OWNER download_manager;"

# 3. Install + migrate + run:
cd image-api
pnpm install
pnpm prisma:migrate
pnpm start:dev
```

The service listens on `http://localhost:3001` by default.

## Configuration

See `.env.development` for the full list. Key knobs:

- `MAX_UPLOAD_SIZE_MB` (default 25)
- `MAX_INPUT_PIXELS` (default 25,000,000 — protects against decompression bombs)
- `FAST_OPS_CONCURRENCY` (default 5)
- `BG_REMOVE_CONCURRENCY` (default 1 — keeps RAM bounded for the AI model)
