# Debian base — needs LibreOffice (document conversions) and Sharp with HEIC.
FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@11.2.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src/

# Keep dev deps (incl. the Prisma CLI) for `prisma migrate deploy` at startup.
RUN pnpm run build

FROM node:22-bookworm-slim AS production

WORKDIR /app

# libreoffice: document conversions (headless). libheif/libde265: HEIC in Sharp.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     openssl ca-certificates libheif1 libde265-0 \
     libreoffice-writer libreoffice-calc libreoffice-impress \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

ENV NODE_ENV=production
ENV LIBREOFFICE_BIN=libreoffice

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p storage/uploads storage/converted storage/temp

EXPOSE 3200

CMD ["node", "dist/main.js"]
