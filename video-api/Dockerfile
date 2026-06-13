FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl \
  && corepack enable \
  && corepack prepare pnpm@11.2.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/
COPY scripts ./scripts/

ENV DATABASE_URL=postgresql://download_manager:download_manager@postgres:5432/download_manager?schema=public

RUN pnpm install --frozen-lockfile

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src/

# Keep dev deps (incl. the Prisma CLI) so the container can run
# `prisma migrate deploy` on startup.
RUN pnpm run build

FROM node:22-alpine AS production

WORKDIR /app

RUN apk add --no-cache \
    openssl \
    ffmpeg \
    python3 \
    py3-pip \
  && pip3 install --no-cache-dir --break-system-packages yt-dlp \
  && corepack enable

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p storage/videos storage/audio storage/thumbnails storage/temp storage/merged

EXPOSE 3000

CMD ["node", "dist/main.js"]
