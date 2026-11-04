# GarudHub release log (P0-G4)

Tag **`main`** deployments here for rollback reference. Optional git tags: `vYYYY.MM.DD-N`.

| Date (UTC) | Tag / ref | Environment | Deployed by | Notes |
|------------|-----------|-------------|-------------|-------|
| _example_ | `v2026.11.04-1` / `abc1234` | production | Ops | Initial prod from main |

## Release entry template

Copy for each production deploy:

```markdown
### YYYY-MM-DD — vYYYY.MM.DD-N

- **Commit:** `<full sha>` on `main`
- **Migrations:** yes/no — `<migration names if yes>`
- **Env changes:** none / list keys touched (no secret values)
- **Smoke:** [`docs/STAGING_SMOKE_CHECKLIST.md`](../docs/STAGING_SMOKE_CHECKLIST.md) PASS on staging before merge
- **Prod smoke:** health OK · small live payment (if applicable)
- **Rollback:** redeploy previous tag / `git checkout <prev-sha>` + `remote-deploy-prod.sh`
```

## Related

- Staging CI: [`.github/workflows/dev-ci.yml`](../.github/workflows/dev-ci.yml)
- Production CI: [`.github/workflows/main-ci.yml`](../.github/workflows/main-ci.yml)
- Deploy scripts: [`deploy/scripts/`](../deploy/scripts/)
- Readiness: [`docs/PRODUCTION_READINESS.md`](../docs/PRODUCTION_READINESS.md)
