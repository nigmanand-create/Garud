# httpOnly session cookies (P1-1)

**Default:** Browser sessions use `garud_access` and `garud_refresh` httpOnly cookies (`SameSite=Lax`, `Secure` in production). The Next.js `/platform-api` proxy forwards `Cookie` and `Set-Cookie`.

| Variable | Where | Values |
|----------|-------|--------|
| `AUTH_SESSION_MODE` | backend | `cookies` (default except `NODE_ENV=test`), `bearer`, `dual` |
| `NEXT_PUBLIC_AUTH_SESSION` | frontend | omit or `cookies`; set `bearer` only for legacy localStorage debugging |

**Break-glass (mobile / Swagger / e2e):** Set `AUTH_SESSION_MODE=bearer` on the API and `NEXT_PUBLIC_AUTH_SESSION=bearer` on the web bundle. Clients send `Authorization: Bearer <accessToken>` and JSON `refreshToken` on `/auth/refresh` as before.

**Logout:** Clears cookies server-side; refresh row revoked when refresh token is present (cookie or body).
