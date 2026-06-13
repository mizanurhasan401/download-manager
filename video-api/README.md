# Video Downloader API

Production-grade NestJS backend for a multi-platform video downloader.

## Prerequisites

- Node.js 22+
- pnpm 11+
- Docker & Docker Compose
- **yt-dlp** and **FFmpeg** on the host (local dev only — included in the Docker image)

### Install yt-dlp and FFmpeg (local dev)

**yt-dlp** (project-local binary, no sudo):

```bash
pnpm run setup:tools
```

This downloads a **standalone** `yt-dlp` binary to `./bin/yt-dlp` (macOS/Linux builds that do not rely on the system Python). Set `YTDLP_PATH=./bin/yt-dlp` in `.env.development`.

**FFmpeg** (system package, required for merge/audio conversion):

```bash
sudo apt update
sudo apt install -y ffmpeg
```

Verify:

```bash
./bin/yt-dlp --version
ffmpeg -version
```

Restart the API after installing or changing `.env.development`.

---

## Option A — Local development (recommended for coding)

### Step 1: Clone and enter the project

```bash
cd ~/Desktop/Development/download-manager
```

### Step 2: Copy environment file

```bash
cp .env.development.example .env.development
```

Edit `.env.development` if needed. Hostnames are **not hardcoded in code** — they come from this file:

| Variable | Local value | Purpose |
|----------|-------------|---------|
| `HOST` | `localhost` | API bind host + URLs in startup logs |
| `POSTGRES_HOST` | `localhost` | PostgreSQL hostname |
| `REDIS_HOST` | `localhost` | Redis hostname |

### Step 3: Start PostgreSQL and Redis

```bash
docker compose up -d postgres redis
```

Verify containers are healthy:

```bash
docker compose ps
```

### Step 4: Install dependencies

```bash
pnpm install
```

### Step 5: Run database migrations

```bash
pnpm run prisma:migrate
```

When prompted for a migration name, you can enter: `init`

### Step 6: Start the API (terminal 1)

```bash
pnpm run start:dev
```

API will be available at the host/port from `.env.development`:

- Base URL: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/docs`
- Health: `http://localhost:3000/api/v1/health`

### Step 7: Start the download worker (terminal 2)

```bash
pnpm run start:worker:dev
```

The worker processes jobs from the `video-download-queue`.

---

## Option B — Full Docker stack (API + worker + DB + Redis)

### Step 1: Prepare environment

```bash
cp .env.docker.example .env.development
```

Docker Compose overrides service hostnames automatically:

- `POSTGRES_HOST=postgres`
- `REDIS_HOST=redis`
- `HOST=0.0.0.0` (inside container)

### Step 2: Start infrastructure first

```bash
docker compose up -d postgres redis
```

### Step 3: Run migrations from your machine

```bash
pnpm install
pnpm run prisma:migrate
```

> Keep `POSTGRES_HOST=localhost` in `.env.development` for migrations run from the host, **or** temporarily set `POSTGRES_HOST=localhost` while Postgres port `5432` is exposed.

### Step 4: Build and start API + worker

```bash
docker compose --profile full up -d --build
```

### Step 5: View logs

```bash
docker compose logs -f api
docker compose logs -f worker
```

Access from browser:

- Swagger: `http://localhost:3000/docs`
- Health: `http://localhost:3000/api/v1/health`

---

## Database web UI (Prisma Studio)

Prisma Studio is a browser-based database viewer.

### Start Prisma Studio

```bash
pnpm run prisma:studio
```

### Open in browser

```
http://localhost:5555
```

From here you can browse and edit:

- `users`
- `videos`
- `download_jobs`
- `download_history`

Press `Ctrl+C` in the terminal to stop Prisma Studio.

---

## Quick API test

### 1. Extract metadata

```bash
curl -X POST http://localhost:3000/api/v1/downloads/metadata \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

### 2. Start download (use `videoId` and `formatId` from step 1)

```bash
curl -X POST http://localhost:3000/api/v1/downloads/start \
  -H "Content-Type: application/json" \
  -d '{"videoId":"<VIDEO_UUID>","formatId":"<FORMAT_ID>"}'
```

### 3. Check status

```bash
curl http://localhost:3000/api/v1/downloads/status/<DOWNLOAD_JOB_UUID>
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/downloads/metadata` | Extract video metadata & formats |
| POST | `/api/v1/downloads/start` | Queue a download job |
| GET | `/api/v1/downloads/status/:id` | Get download progress |
| GET | `/api/v1/downloads/file/:id` | Download completed file |
| DELETE | `/api/v1/downloads/:id` | Cancel/delete download |
| GET | `/api/v1/health` | Health check (DB, Redis, storage) |

---

## Useful commands

| Command | Description |
|---------|-------------|
| `pnpm run start:dev` | Start API in watch mode |
| `pnpm run start:worker:dev` | Start BullMQ worker in watch mode |
| `pnpm run build` | Compile TypeScript |
| `pnpm run prisma:migrate` | Apply dev migrations |
| `pnpm run prisma:studio` | Open DB web UI |
| `docker compose up -d postgres redis` | Start DB + Redis only |
| `docker compose --profile full up -d --build` | Start everything in Docker |

---

## Environment variables

See `.env.development.example` for the full list.

Key host settings:

```env
HOST=localhost
POSTGRES_HOST=localhost
REDIS_HOST=localhost
```

For Docker services, see `.env.docker.example`.

## License

MIT
