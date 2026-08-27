#!/usr/bin/env bash
# Run this ONCE on the server (from the repo root) to create .env.production with fresh random
# secrets. Never run this locally and copy the file over — generate it in place on the server so
# the real secrets never pass through git, chat, or any other channel.
#
# Usage: ./deploy/generate-env.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env.production ]; then
  echo ".env.production already exists — refusing to overwrite it (delete it first if you really want fresh secrets)." >&2
  exit 1
fi

rand() { openssl rand -hex 32; }

POSTGRES_PASSWORD=$(rand)
APP_DB_PASSWORD=$(rand)
JWT_ACCESS_SECRET=$(rand)
JWT_REFRESH_SECRET=$(rand)
S3_ACCESS_KEY_ID="omboo_$(openssl rand -hex 6)"
S3_SECRET_ACCESS_KEY=$(rand)

cat > .env.production <<EOF
# Generated $(date -u +%Y-%m-%dT%H:%M:%SZ) by deploy/generate-env.sh — DO NOT commit this file.

POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
APP_DB_PASSWORD=${APP_DB_PASSWORD}

# Superuser connection (migrations, one-off scripts) — bypasses Postgres RLS by design.
DATABASE_URL=postgresql://omboo:${POSTGRES_PASSWORD}@db:5432/omboo?schema=public
# Unprivileged connection the running app actually uses — RLS applies to this role.
APP_DATABASE_URL=postgresql://omboo_app:${APP_DB_PASSWORD}@db:5432/omboo?schema=public

JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL_DAYS=30

S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID}
S3_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY}
S3_BUCKET=omboo-signatures
S3_FORCE_PATH_STYLE=true

# Fill in for real email delivery (https://resend.com) — leave EMAIL_SEND_ENABLED=false to have
# the API log emails instead of sending, until this is set.
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=Omboo <no-reply@omboo.am>
EMAIL_SEND_ENABLED=false

API_PORT=4000
WEB_ORIGIN=https://app.omboo.am
NEXT_PUBLIC_API_URL=https://api.omboo.am
EOF

chmod 600 .env.production
echo "Wrote .env.production (mode 600). Review RESEND_API_KEY / EMAIL_SEND_ENABLED before going live."
