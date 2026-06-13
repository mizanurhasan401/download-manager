# Debian (glibc) base — @imgly/background-removal-node ships onnxruntime
# native bindings that do not run on Alpine/musl.
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

# libheif/libde265 add HEIC encode/decode support to Sharp.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     openssl ca-certificates libheif1 libde265-0 \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p storage/originals storage/processed storage/temp

EXPOSE 3100

CMD ["node", "dist/main.js"]
