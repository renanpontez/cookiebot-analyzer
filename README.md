# Cookie Audit

Free, open-source Cookiebot scan-report analyzer. Drop in an exported HTML
report, get spreadsheet-ready numbers, a markdown ticket summary you can
paste straight into Jira/Linear, and contextual fix instructions citing
Cookiebot's own docs.

Built by [martinzrenan.dev](https://martinzrenan.dev) · MIT licensed.

## Features

- **Client-side parsing.** Your scan HTML never leaves the browser. The full
  parser ships in the bundled JS — no server, no upload, no storage.
- **All the numbers** the user would manually count: total trackers, new,
  removed, unclassified, pre-consent violations, GDPR-non-adequate transfers,
  per-category breakdown, status.
- **Issue-first filters** in the cookie table: Pre-consent only, Not adequate,
  Any issue, plus per-category.
- **Recommended actions** card per issue type, linking to the exact Cookiebot
  doc that describes the fix.
- **Copy ticket summary** button — markdown formatted with status, counts,
  findings (with doc links), and top violators.
- **TSV row** for the monthly audit spreadsheet + full **cookies CSV**
  download.

## Stack

- Vite 6 + React 18 + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Lucide React icons
- No backend

## Run

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck    # tsc --noEmit
npm run build        # outputs to dist/
```

## Parser

The single source of truth is `src/lib/parser.ts`. It's a TypeScript port of
the Python reference parser in
`~/.claude/skills/cookiebot-audit/scripts/parse_cookiebot.py` and produces
identical output for every Cookiebot HTML scan-report format we've tested
(24 reports across cpk.com, order.cpk.com, ncai.org).

Key invariants:

- Cookie rows are anchored by the TYPE/EXPIRY pattern in cells 3 & 4
  (TYPE ∈ {HTTP, HTML, Pixel, …}; EXPIRY matches `Session | Persistent | N
  days | N year(s) | …`). This survives Cookiebot's "weird" HTML where
  labels and values are interleaved between table cells.
- The redundant "New cookies (N)" and "Removed cookies (N)" trailing
  sections are skipped — counts always reflect active cookies in the main
  category sections (Necessary / Preferences / Statistics / Marketing /
  Unclassified).
- Missing summary fields (e.g. no "New cookies:" line in the export) are
  coerced to `0` for spreadsheet output, never `null`.

## How findings map to Cookiebot docs

| Finding | Recommendation | Source |
|---|---|---|
| Pre-consent violations | Add `type="text/plain"` + `data-cookieconsent` to each script tag | [Manual cookie blocking](https://support.cookiebot.com/hc/en-us/articles/4405978132242-Manual-cookie-blocking) |
| Unclassified | Cookiebot Admin → Cookies and Trackers → assign category + purpose | [Classify unclassified cookies](https://support.cookiebot.com/hc/en-us/articles/360003735214-How-do-I-classify-unclassified-cookies) |
| Not adequate | Remove the cookie, or update consent banner to flag the transfer | [Adequate vs non-adequate transfers](https://support.cookiebot.com/hc/en-us/articles/360004205093-Send-personal-data-to-adequate-3rd-countries) |

## Deploy

Static site — works on Vercel, Netlify, Cloudflare Pages, or any CDN.

```bash
npm run build
# then deploy dist/
```

## License

MIT — see [LICENSE](./LICENSE).
