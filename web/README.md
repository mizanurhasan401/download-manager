# VidGrab Web

Next.js frontend for the VidGrab video downloader. Paste a supported URL, pick a format, and track download progress in a premium dark UI.

## Prerequisites

- Node.js 22+
- pnpm 11+
- VidGrab API running locally (see [`api/README.md`](../../api/README.md))

## Setup

```bash
cd web
cp .env.local.example .env.local   # optional
pnpm install
```

Ensure the VidGrab API is running on port **3000** (see [`api/README.md`](../api/README.md)). The web app proxies `/api/v1/*` to it automatically in dev.

## Development

```bash
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001). Or run everything with `./dev.sh` from the repo root.

## Build

```bash
pnpm build
pnpm start
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Paste a URL, fetch metadata, choose MP4/MP3 quality, start download |
| `/history` | Local download history (persisted in browser storage) |
| `/health` | API health check dashboard |

## Supported providers

YouTube, Facebook, Instagram, TikTok, and Vimeo.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `/api/v1` | Base URL for the VidGrab API (proxied to port 3000 in dev) |

## Stack

- Next.js 16 (App Router)
- React 19
- TanStack Query
- Zustand
- React Hook Form + Zod
- Tailwind CSS 4
- Framer Motion (metadata card fade-in)
- shadcn-style UI components
