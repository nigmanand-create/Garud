# Demo accounts (local development only)

**Do not use these passwords in production.** Run `npm run prisma:seed` in `backend/` after migrations.

Default password for partner / buyer / government / checkout test: **`ChangeMeDemo123!`** (include the `!` at the end).  
Override for those accounts: set `DEMO_PASSWORD` in `backend/.env`.

**Admin** uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env` when set (this repo’s `.env.example` uses **`ChangeMeAdmin123!`** for admin — not the same as `ChangeMeDemo123!`).

| Email | Password | Role | After login (frontend) |
|-------|----------|------|------------------------|
| `admin@garudhub.local` | `ChangeMeAdmin123!` (if `ADMIN_PASSWORD` in `.env`) | `PLATFORM_ADMIN` | `/admin` |
| `partner@garudhub.local` | `ChangeMeDemo123!` | `PARTNER` (verified org) | `/partner` |
| `buyer@garudhub.local` | `ChangeMeDemo123!` | `BUYER` | `/marketplace` → cart `/buyer/cart`, orders `/buyer/orders`, RFQs `/buyer/rfqs` |
| `checkout-test@garudhub.local` | `ChangeMeDemo123!` | `BUYER` (dedicated checkout QA) | Same as buyer — use this account for checkout flows |
| `government@garudhub.local` | `ChangeMeDemo123!` | `GOVERNMENT` | Same as buyer (cart + RFQs) |

Login: http://localhost:3001/auth/login

## Checkout test (manual QA)

Use the dedicated buyer so cart/checkout state does not mix with other demos.

| Field | Value |
|-------|--------|
| Email | `checkout-test@garudhub.local` |
| Password | `ChangeMeDemo123!` |

**Listing to add to cart:** **Garud AgriSpray X1** (SKU `GD-AGRI-X1`) — published, fixed price ₹2,85,000, from verified partner **Demo Drone Manufacturing Pvt Ltd** (`partner@garudhub.local`).

**Steps**

1. Start Postgres (`docker compose up -d` from repo root) and seed: `cd backend && npm run prisma:migrate && npm run prisma:seed`.
2. Open http://localhost:3001/auth/login and sign in with the checkout test email/password.
3. Go to **Marketplace** (`/marketplace`), open **Garud AgriSpray X1**, set quantity ≥ 1, **Add to cart**.
4. Open **Cart** (`/buyer/cart`), review line items, proceed to **Checkout**.
5. Complete checkout and confirm order appears under **Orders** (`/buyer/orders`).

Backend API (if running): `POST http://localhost:3000/api/v1/auth/login` with JSON `{ "email": "checkout-test@garudhub.local", "password": "ChangeMeDemo123!" }`.
