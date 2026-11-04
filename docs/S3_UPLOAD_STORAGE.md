# S3 / R2 upload storage (P1-4)

When `UPLOAD_STORAGE=s3` (or `r2`), partner KYC documents and listing images are stored in a private bucket instead of local disk.

## Required env

| Variable | Description |
|----------|-------------|
| `UPLOAD_STORAGE` | `local` (default) or `s3` / `r2` |
| `S3_BUCKET` | Bucket name |
| `S3_REGION` | AWS region (e.g. `ap-south-1`) |
| `S3_ACCESS_KEY_ID` | IAM access key |
| `S3_SECRET_ACCESS_KEY` | IAM secret |

Optional for Cloudflare R2 or MinIO:

| Variable | Description |
|----------|-------------|
| `S3_ENDPOINT` | Custom endpoint URL (R2 / MinIO) |
| `S3_PUBLIC_BASE_URL` | Not used in v1 — delivery is via API streams |

## Behaviour

- **Writes** use `PutObject` with keys matching the previous local layout (`organizations/…`, `listings/…`).
- **Reads** in the API use `GetObject` streams (same as local `createReadStream`).
- **Signed URLs** for direct browser download are not wired in v1; use existing authenticated download routes. To add presigned GET links, call `getSignedReadUrl` on the storage port (S3 only) from a future endpoint.

## Rollback

Set `UPLOAD_STORAGE=local` and ensure `UPLOAD_DIR` is on a persistent volume. Existing DB paths remain valid only for objects that exist on the active backend.
