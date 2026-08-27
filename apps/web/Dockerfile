# Build context is the monorepo root (see docker-compose.prod.yml: `context: .`).

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN npm install -g turbo@2

# --- prune: shrink the monorepo down to just what @omboo/web needs ---
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @omboo/web --docker

# --- install + build ---
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
# turbo prune only copies files belonging to the pruned workspace packages — tsconfig.base.json
# lives at the repo root and is pulled in via `extends`, so it has to be copied separately.
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, not read at container
# runtime — so the real API URL has to be supplied as a build arg, not just an env var on the
# running container. docker-compose.prod.yml passes this through from .env.production.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN turbo run build --filter=@omboo/web

# --- runtime: only the standalone server output + static assets, nothing else ---
FROM base AS runner
WORKDIR /app
RUN addgroup --system omboo && adduser --system --ingroup omboo omboo
ENV HOME=/app

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=omboo:omboo /app/apps/web/.next/standalone ./
COPY --from=builder --chown=omboo:omboo /app/apps/web/.next/static ./apps/web/.next/static

USER omboo
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
