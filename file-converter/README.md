# File Converter Microservice

Production-grade file conversion microservice. Converts documents and images between formats via a queue-driven NestJS service.

## Supported conversions

### Documents (LibreOffice headless)
- PDF → DOCX
- DOCX → PDF
- PPTX → PDF
- XLSX → PDF
- TXT → PDF

### Images (Sharp)
- PNG → JPG
- JPG → PNG
- WebP → PNG
- PNG → WebP

## Architecture

```
HTTP Controller  →  Service  →  BullMQ Queue  →  Worker (Processor)
                                                      │
                                                      ├─ Sharp (images)
                                                      ├─ LibreOffice CLI (documents)
                                                      └─ pdf-lib (PDF post-processing)
                                                      │
                                                      ▼
                                                 Local storage
```

- **Two queues**: `file-image-convert-queue` (fast, parallel) and `file-document-convert-queue` (LibreOffice, serial).
- **SSE realtime** progress at `/api/v1/file-converter/progress/:id` (states: `QUEUED`, `PROCESSING`, `CONVERTING`, `COMPLETED`, `FAILED`).
- **Polling fallback** via `GET /api/v1/file-converter/status/:id`.
- **Persistence**: Postgres + Prisma (`file_conversion_jobs`, `file_conversion_files`, `file_conversion_history`).

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/file-converter/convert` | Multipart upload + start conversion |
| `GET`  | `/api/v1/file-converter/status/:id` | Polling status |
| `GET`  | `/api/v1/file-converter/progress/:id` | SSE live progress stream |
| `GET`  | `/api/v1/file-converter/file/:id` | Download original or output |
| `GET`  | `/api/v1/file-converter` | List recent jobs |
| `DELETE` | `/api/v1/file-converter/:id` | Delete a job + its files |
| `GET`  | `/api/v1/health` | Service health (db, redis, storage) |

Swagger: `http://localhost:3200/docs`.

## Local setup

```bash
# 1. Install host dependencies (one-time)
sudo apt install libreoffice            # or: brew install libreoffice

# 2. Install Node deps
pnpm install

# 3. Create the dedicated database (reuses the shared Postgres from api/)
psql -h localhost -U download_manager -c "CREATE DATABASE file_conversion;"

# 4. Generate Prisma client + run migrations
pnpm prisma:generate
pnpm prisma:migrate

# 5. Run the service (port 3200)
pnpm start:dev
```

## Environment variables

See `.env.development` for the full list. Key knobs:

- `PORT=3200`
- `DATABASE_URL=postgresql://.../file_conversion?schema=public`
- `REDIS_HOST` / `REDIS_PORT` (shared with the other services)
- `MAX_UPLOAD_SIZE_MB=50`
- `IMAGE_CONVERSION_CONCURRENCY=4`
- `DOCUMENT_CONVERSION_CONCURRENCY=1`
- `LIBREOFFICE_BIN=libreoffice`
- `LIBREOFFICE_TIMEOUT_MS=120000`
- `JOB_TTL_HOURS=24`
