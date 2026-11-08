# Government tender import (Phase 1)

Phase 1 is **admin CSV bulk import** — legal, practical curation without scraping GeM, CPPP, or other portals.

## Admin UI

- **Page:** `/admin/gov-opportunities`
- **Import CSV:** upload a `.csv` file or paste CSV text
- **Sample template:** `/samples/gov-opportunity-import-template.csv` (download link on the admin page)

## API

`POST /api/v1/admin/gov-opportunities/import`  
**Auth:** `PLATFORM_ADMIN` only (Bearer or cookie session).

Accepts:

1. **Multipart** — field `file` (CSV, max 2 MB), or form field `csv` (raw text)
2. **JSON** — `{ "csv": "type,title,…\n…" }` or `{ "rows": [ { … } ] }`

Response:

```json
{
  "created": 2,
  "updated": 0,
  "skipped": 1,
  "errors": 0,
  "rows": [
    { "row": 2, "action": "created", "id": "…", "title": "…", "referenceNo": "…" }
  ]
}
```

## CSV columns

Headers are **flexible** (camelCase, snake_case, or spaced labels). Aliases are normalized server-side.

| CSV column | Maps to | Required | Notes |
|------------|---------|----------|--------|
| `type` | `type` | No (default `TENDER`) | `TENDER`, `SCHEME`, `SUBSIDY` |
| `title` | `title` | Yes | min 3 chars |
| `summary` | `summary` | Yes | min 10 chars |
| `issuingBody` | `issuingBody` | Yes | min 2 chars |
| `referenceNo` | `referenceNo` | No | Used for dedupe |
| `state` | `state` | No | Blank = national |
| `estimatedValueInr` | `estimatedValueInr` | No | Commas allowed |
| `closingAt` | `closingDate` | No | ISO or `YYYY-MM-DD` |
| `officialUrl` | `sourceUrl` | No | Must be `http(s)://` |
| `eligibility` | `eligibility` | No | |
| `details` | `description` | No | Long text |
| `publish` | `status` | No | `true` / `1` / `yes` → `PUBLISHED`; else **DRAFT** |

Also supported: `openDate`, `description`, `sourceUrl`, `closingDate`.

## Dedupe rules

Per import row:

1. If `referenceNo` is set → match existing row by reference (case-insensitive).
2. Else → match by **title + issuingBody** (case-insensitive).
3. If match is **DRAFT** → **update** with CSV data.
4. If match is **PUBLISHED** or **CLOSED** → **skip** (reported in `rows[]`).

New rows are created as **DRAFT** unless `publish=true`.

Limit: **500 rows** per request.

## Phase 2 — GeM / CPPP feeds (not in Phase 1 code)

When the client provides **official** access:

- GeM portal CSV export or documented API credentials
- CPPP / state e-procurement feeds where terms allow automated import

Implementation plan:

- `GovIngestionService` (`GOV_GEM_ENABLED=false` by default) for a scheduled worker
- Normalize vendor payloads into the same import row shape → reuse `GovService.importFromCsv` / `importJsonRows`
- **No** HTML scraping or bypass of portal ToS in this repository

## Local URLs

| Env | Admin import UI | API |
|-----|-----------------|-----|
| Dev | http://localhost:3001/admin/gov-opportunities | http://127.0.0.1:3000/api/v1/admin/gov-opportunities/import |
| Staging | https://dev.garudhub.me/admin/gov-opportunities | https://dev.garudhub.me/platform-api/v1/admin/gov-opportunities/import |
