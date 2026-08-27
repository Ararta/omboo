# Build context is the monorepo root (see docker-compose.prod.yml: `context: .`), since a
# pnpm/turbo workspace app can't be built from its own subdirectory in isolation.

FROM node:20-slim AS base
# openssl has to be present wherever `prisma generate` runs (here in the builder stage below),
# not just at runtime — Prisma picks which query engine binary to fetch based on the openssl
# version it can detect at generate time, and a mismatch against the runner stage's openssl
# produces a "could not locate the Query Engine for runtime ..." crash at boot.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN npm install -g turbo@2

# --- prune: shrink the monorepo down to just what @omboo/api needs (its own source plus
# packages/database and packages/shared, which it depends on) ---
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @omboo/api --docker

# --- install + build ---
FROM base AS builder
WORKDIR /app
# Puppeteer's Chromium download defaults to ~/.cache/puppeteer, outside /app — pin it inside
# /app so the runner stage's `COPY --from=builder /app .` actually picks it up.
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
# turbo prune only copies files belonging to the pruned workspace packages — tsconfig.base.json
# lives at the repo root and is pulled in via `extends`, so it has to be copied separately.
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
RUN pnpm --filter @omboo/database exec prisma generate
RUN turbo run build --filter=@omboo/api
# nest-cli.json's asset-copy (the .hbs PDF templates) is timing-sensitive under turbo/Docker's
# filesystem and isn't reliably done by the time the build step above exits — copy every .hbs
# under src into the matching dist path explicitly rather than trust it landed.
RUN cd apps/api/src && find . -name '*.hbs' -exec sh -c 'mkdir -p "../dist/$(dirname "$1")" && cp "$1" "../dist/$1"' _ {} \;

# --- runtime: Debian slim (not Alpine) — Puppeteer's bundled Chromium needs glibc, and this
# is the base image Puppeteer's own docs recommend pairing it with ---
FROM node:20-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 \
    libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 libx11-xcb1 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libxkbcommon0 xdg-utils wget \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app
# HOME has to point somewhere the omboo user can actually write — `useradd -r` (system account)
# doesn't create/own a real home directory, and both corepack and pnpm want to write cache
# files under $HOME the first time they run.
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer HOME=/app
RUN groupadd -r omboo && useradd -r -g omboo omboo

COPY --from=builder /app .

RUN chown -R omboo:omboo /app
USER omboo

EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
