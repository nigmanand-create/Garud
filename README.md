# Garud

**GarudHub** — B2B drone marketplace platform (NestJS API + Next.js frontend).

## Repository layout

| Path | Description |
|------|-------------|
| `backend/` | NestJS API, Prisma, PostgreSQL |
| `frontend/` | Next.js app (marketing snapshots + platform UI) |
| `DEMO_ACCOUNTS.md` | Demo login accounts after seed |
| `PROJECT_TWO_TRACKS.md` | Marketing vs platform route map |
| `PROJECT_WORKING_PRINCIPLES.md` | Project conventions |

## Quick start

1. Start PostgreSQL: `docker compose up -d` (from repo root).
2. **Backend** (`backend/`): copy `.env.example` → `.env`, then `npm install`, `npm run prisma:migrate`, `npm run prisma:seed`, `npm run start:dev` (port 3000).
3. **Frontend** (`frontend/`): copy `.env.example` as needed, `npm install`, `npm run dev` (port 3001).

See `frontend/README.md` and `backend/LOCAL_DEVELOPMENT.md` for details.

## Security

Do not commit `.env` files; they are listed in `.gitignore`. Use the provided `.env.example` templates.
