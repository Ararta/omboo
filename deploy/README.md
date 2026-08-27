# Production deployment (single VPS)

Everything here runs from one Docker Compose stack: Postgres, MinIO, the API, the web app, and
Caddy as a reverse proxy that gets TLS certificates from Let's Encrypt automatically. Designed
for a modest VPS (2 vCPU / 4GB RAM / 80GB SSD is enough for an early beta) and to be run entirely
from your own terminal — nothing here is executed by Claude on your behalf.

## 0. Before you start

**Rotate the VPS root password.** If it was ever shared anywhere outside your password manager
(chat, email, a ticket), change it now from your VPS provider's dashboard, then switch to SSH
key auth so you stop needing a password at all:

```bash
# from your own machine
ssh-keygen -t ed25519 -C "omboo-deploy"
ssh-copy-id root@78.141.214.29          # or paste ~/.ssh/id_ed25519.pub into your VPS provider's UI
```

## 1. DNS

Point these two A records at the server's IP (`78.141.214.29`). `omboo.am` and `www.omboo.am`
stay pointed wherever the existing marketing site lives — this app deploys under its own
subdomain, not the bare domain:

| Type | Host              | Value            |
|------|-------------------|------------------|
| A    | app.omboo.am      | 78.141.214.29    |
| A    | api.omboo.am      | 78.141.214.29    |

DNS propagation can take a few minutes to a few hours. `dig app.omboo.am` should resolve to the
server's IP before continuing to step 3 (Caddy needs this to succeed at getting a certificate).

Per-organization subdomains (`<slug>.omboo.am`) need wildcard DNS + a wildcard cert, which is
extra setup (DNS-01 challenge, a token for whichever provider manages omboo.am's DNS) — not
required to launch. Every org can register and log in at `app.omboo.am` today; wildcard
subdomains are a purely additive upgrade for later.

## 2. Server setup

SSH in as root (or your new key-based user) and run:

```bash
apt-get update && apt-get upgrade -y

# Docker
curl -fsSL https://get.docker.com | sh

# Firewall — only SSH, HTTP, HTTPS
apt-get install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# A non-root user to run things as, in the docker group
adduser --disabled-password --gecos "" omboo
usermod -aG docker omboo
```

From here on, do everything as `omboo` (`su - omboo`), not root.

## 3. Get the code and generate secrets

```bash
git clone https://github.com/Ararta/omboo.git
cd omboo
./deploy/generate-env.sh
```

This writes `.env.production` (mode 600, gitignored) with fresh random secrets — Postgres
password, the `omboo_app` role password, JWT signing secrets, MinIO credentials. Nothing in it
is ever committed or sent anywhere.

Open `.env.production` and fill in `RESEND_API_KEY` if you want real emails sent (leave
`EMAIL_SEND_ENABLED=false` for now if you'd rather verify the app works first — the API logs
emails instead of sending them while that's off).

## 4. Bring the stack up

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

First run builds both images (a few minutes — the API image installs Chromium's dependencies
for PDF generation) and applies every database migration, including the one that creates the
`omboo_app` role Postgres RLS depends on; its password gets rotated to the real secret
automatically before the API ever starts (see the `rotate-app-password` step in
`docker-compose.prod.yml` if you want the details).

Check everything is healthy:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api web caddy
```

Caddy requests its Let's Encrypt certificates on first request to each domain — the very first
`https://app.omboo.am` load may take a few extra seconds while that happens.

## 5. Verify

- `https://app.omboo.am/register-organization` — create your real first organization (this
  replaces running the demo `seed.ts`, which is intentionally never run against production).
- `https://api.omboo.am/api/auth/login` (POST) — should reply `{"message":"..."}` for a bad
  login rather than connection-refused or a TLS error.

## Redeploying after a code change

```bash
cd omboo
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

New migrations run automatically as part of `migrate` before `api` restarts; existing data and
`.env.production` are untouched.

## Not set up yet (intentional follow-ups, not blockers)

- **Backups** — `omboo_db_data` is a plain Docker volume with nothing snapshotting it. At
  minimum, cron a nightly `docker compose exec -T db pg_dump -U omboo omboo | gzip > backup.sql.gz`
  onto storage that isn't the same VPS.
- **Wildcard subdomains** — see the DNS section above.
- **CI/CD** — deploys are a manual `git pull` + `up -d --build` for now.
