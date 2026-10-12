# GarudHub Backend — Local Development

How to run the NestJS API, PostgreSQL (Docker), and Swagger on your machine.

---

## Prerequisites

- **Docker Desktop** running
- **Node.js 20+** (project uses `.nvmrc` → `20`)
- **nvm** recommended: `nvm use 20` inside `backend/`

---

## Environment

Copy env once if needed:

```bash
cd /Users/blackstar/dev/client/garud/backend
cp .env.example .env
```

Important variables in `.env`:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Must use Docker Postgres on **`127.0.0.1:5434`** (not Mac Postgres on 5432) |
| `UPLOAD_DIR` | Local folder for partner document uploads (default `./uploads`) |
| `JWT_*` | Access/refresh secrets and expiry |
| `DEMO_PASSWORD` | Shared dev password for all seeded demo users |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeded platform admin (optional overrides) |

Example database URL:

```env
DATABASE_URL="postgresql://garud:garud@127.0.0.1:5434/garudhub?schema=public"
```

**Shell override:** If `echo $DATABASE_URL` shows `localhost:5432` or anything other than the line above, your shell overrides `.env` and Prisma will fail with **P1010**. Run `unset DATABASE_URL` before migrate/start.

---

## Stop everything

```bash
# Stop the API: press Ctrl+C in the terminal running npm run start:dev

# If port 3000 is still in use:
lsof -tiTCP:3000 -sTCP:LISTEN | xargs kill -9

# Optional: stop any leftover Nest watch processes
pkill -f "nest start --watch"

# Stop PostgreSQL container
cd /Users/blackstar/dev/client/garud
docker compose stop
```

---

## Start (full sequence)

Run in **two steps**. Use **only one terminal** for `npm run start:dev`.

### 1. Database

```bash
cd /Users/blackstar/dev/client/garud
docker compose up -d
```

Postgres listens on host port **5434** (see `docker-compose.yml`).

### 2. API

```bash
cd /Users/blackstar/dev/client/garud/backend

unset DATABASE_URL

nvm use 20

# First time only, or after new Prisma migrations:
npm run prisma:migrate

# First time only (creates demo users — see ../DEMO_ACCOUNTS.md):
npm run prisma:seed

npm run start:dev
```

Wait for: `Nest application successfully started`.

---

## Verify

| Resource | URL |
|----------|-----|
| Health | http://localhost:3000/api/v1/health |
| Swagger UI | http://localhost:3000/api/docs |
| OpenAPI JSON | http://localhost:3000/api/docs-json |

**Demo logins** (after `prisma:seed`): see **[DEMO_ACCOUNTS.md](../DEMO_ACCOUNTS.md)** at the repo root (admin, partner, buyer, government — password `ChangeMeDemo123!` by default).

In Swagger: **POST** `/api/v1/auth/login` → copy `accessToken` → **Authorize** → paste token.

---

## Common errors

### `EADDRINUSE` — port 3000 already in use

Another `start:dev` is still running. Stop it (Ctrl+C) or:

```bash
lsof -tiTCP:3000 -sTCP:LISTEN | xargs kill -9
```

Do not start two dev servers on the same port.

### `P1010` — User was denied access on the database

Usually wrong Postgres (Mac on **5432** instead of Docker on **5434**), or bad `DATABASE_URL` in the shell.

```bash
unset DATABASE_URL
# confirm .env has 127.0.0.1:5434
docker compose up -d
PGPASSWORD=garud psql -h 127.0.0.1 -p 5434 -U garud -d garudhub -c 'SELECT 1'
```

### Nest / `@nestjs/config` fails on Node 18

Use Node 20:

```bash
nvm use 20
node -v   # should be v20.x
```

---

## Useful npm scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Dev server with watch |
| `npm run build` | Production build |
| `npm run prisma:migrate` | Apply migrations (dev) |
| `npm run prisma:seed` | Seed demo users (all roles) |
| `npm run prisma:generate` | Regenerate Prisma client |

---

## Project layout (backend)

- `src/modules/identity` — auth (JWT)
- `src/modules/partner` — onboarding application
- `src/modules/documents` — file uploads
- `src/modules/catalog` — partner listings + public marketplace
- `src/modules/rfq` — buyer RFQ, vendor matching, quotations
- `src/modules/admin` — verification

Working principles: `../PROJECT_WORKING_PRINCIPLES.md`
