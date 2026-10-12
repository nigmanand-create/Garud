# GarudHub cloned routes (nav order)

| # | Live URL | Local path |
|---|----------|------------|
| 1 | `/` | `/` (home) |
| 2 | `/about-us` | `/about-us` |
| 3–11 | Services (9 pages) | same slugs |
| 12–13 | Marketplace | `/drone-marketplace`, `/drone-accessories` |
| 14–19 | Partners (6 pages) | same slugs |
| 20 | `/blogging` | `/blogging` |
| 21–32 | Blog posts | `/blogging?slug=…` → rewritten to `/blogging/post/…` |
| 33–43 | Blog categories | `/blogging?category=…` → `/blogging/category/…` |
| 44 | `/enquiry.php` | `/enquiry.php` |
| 45 | `/loan-calculators.php` | `/loan-calculators.php` |
| 46–48 | Legal | `/legal.php?page=tos` etc. |

**Note:** Live `/about.php` returns 404; footer link redirects to `/about-us`.

Refresh all pages from production:

```bash
npm run clone-pages
```
