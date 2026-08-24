# Data Mining tab

The **Data Mining** page from the Spyne Vini Sales console, as a standalone, framework-free web app: a dealer uploads their past lead CSVs, watches the AI analyze them, and sees the outbound appointments hiding in their CRM.

Just the page and its flow — **no console shell, sidebar, or other tabs**. It runs on bundled sample data out of the box and is structured so a backend can be wired in through three API calls with zero UI changes.

## Flow

```
upload  ──▶  analyzing  ──▶  results
  │            (checklist       (health report: headline $, business snapshot,
  │             animation)       the math, 12-month ramp, 17-play table, CTA)
  └─ "Use sample data" jumps straight through with the bundled Zeigler scan
```

## Run locally

No build step. Serve the folder over http (ES fetch needs http, not `file://`):

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Runs entirely on the bundled sample data (`src/mock.js`) — no backend required.

## Project structure

```
index.html            markup shell + script order
assets/
  styles.css          Max 2.0 design tokens + the Data Mining CSS only
  fonts.css           @font-face -> inter.woff2
  inter.woff2         Inter variable font (self-hosted)
src/
  config.js           useMock / apiBaseUrl toggle
  icons.js            inline SVG icon set (ic / icf)
  mock.js             bundled sample payload = the API contract shape
  api.js              API client (mock  ⇄  fetch)
  app.js              state machine + views (render only, hold no data)
```

## Connecting the backend

1. In `src/config.js`, set `useMock: false` and point `apiBaseUrl` at your service.
2. Implement three endpoints (shapes are documented in `src/api.js`, and `src/mock.js` is a live example of every field):

   | Method & path | Purpose | Returns |
   |---|---|---|
   | `POST {base}/scans` | start a scan; multipart body with `lead` + `activity` files | `{ "scanId": "…" }` |
   | `GET {base}/scans/{id}/steps` | progress checklist for the analyzing screen | `[[label, value, valueClass, detail], …]` |
   | `GET {base}/scans/{id}/results` | the full report | results object (see below) |

No view code changes — `app.js` renders whatever `results` the backend returns.

### `results` payload

`dealer`, `headline` (`free`, `eyebrow`, `big`, `bigUnit`, `sub`, `metrics[]`, `commit`), `profile[]` (KPI strip), `sources[]` (lead-source bar), `math` (`funnel[]`, `equation`), `ramp` (`values[]`, `baseline`, `captions[]`, `legend[]`), `payoff` (`rows[]`, `foot`), `opportunities` (`groups[]` of plays, `locked`, `footer`), `reconciliation`, `cta`. Numbers are display strings so the backend owns formatting; a few fields allow inline `<b>` markup (see `src/mock.js`). Opportunity rows reference icons by the key names in `src/icons.js`.

## Design notes

- Max 2.0 / Spyne brand: `#4600F2`, Inter, light theme, inline SVG icons (no emoji).
- Self-hosted variable Inter (`assets/inter.woff2`) as one `@font-face` (`font-weight:100 900`).
- Accessible: `aria-live` on the mount, focus-visible rings, `prefers-reduced-motion` respected.
- The report figures are the real Zeigler Hyundai 3-year opportunity scan (planning estimates). Swap in live data via the API above.
