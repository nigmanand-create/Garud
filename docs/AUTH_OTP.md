# Phone OTP sign-in (India)

This stack supports **email + password**, **Google OAuth**, and **phone OTP** for the same JWT / httpOnly cookie session as `POST /auth/login`.

## Flow

1. `POST /api/v1/auth/otp/request` — body `{ "phone": "9876543210" }`  
   - Normalises to E.164 `+91…`, finds a user by `users.phone_e164` or by matching `organizations.contact_mobile`.  
   - Stores a **SHA-256** hash of the code (with server pepper) and expiry.  
   - Sends SMS via Twilio or MSG91 when configured.  
   - **Non-production** (`NODE_ENV !== production`): if no provider is configured (or SMS fails), the OTP is **logged** server-side (`[dev]` / `[dev fallback]`).  
   - **Production**: missing or broken SMS returns **503** (no console OTP).

2. `POST /api/v1/auth/otp/verify` — body `{ "phone": "…", "code": "123456" }`  
   - Validates the latest non-expired challenge, issues the same tokens as password login (`applyAuthSession`).

## Environment

See `backend/.env.example`. Key variables:

| Variable | Purpose |
|----------|---------|
| `SMS_PROVIDER` | `none` (default), `twilio`, or `msg91` |
| `OTP_CODE_PEPPER` | Extra secret mixed into the hash (falls back to `JWT_REFRESH_SECRET`) |
| `OTP_TTL_SECONDS` | Challenge lifetime (default 600) |
| `OTP_PHONE_WINDOW_MIN` / `OTP_MAX_PER_PHONE_PER_WINDOW` | Per-phone attempt window (DB-backed) |
| `SMS_OTP_MESSAGE_TEMPLATE` | Include `{{code}}` |
| `THROTTLE_OTP_REQUEST_*` | IP rate limit for `/auth/otp/request` |

Twilio: `SMS_TWILIO_ACCOUNT_SID`, `SMS_TWILIO_AUTH_TOKEN`, `SMS_TWILIO_FROM`.

MSG91: `SMS_MSG91_AUTHKEY`, optional `SMS_MSG91_SENDER_ID`, `SMS_MSG91_ROUTE`.

## Data model

- `users.phone_e164` — optional unique E.164; set on verify for matched org-only users.  
- `users.phone_verified_at` — set on first successful OTP verify.  
- `otp_challenges` — hashed codes with TTL.

## Registration and linking

OTP **sign-in only** resolves existing users. **New** accounts still use **email/password** or **Google** (then complete profile). Linking Google + phone on one user is a follow-up (merge rules, optional “add phone” in settings).

## India operations

Use a licensed **DLT**-compliant sender (MSG91 / Twilio India, etc.), template registration, and **consent** for OTP. Rate-limit aggressively; never return whether a phone is registered from a public endpoint if product policy requires (currently 404 vs invalid is separate messages — tighten if needed).
