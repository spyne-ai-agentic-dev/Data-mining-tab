# Data Mining tab

The **Data Mining** page from the Spyne Vini Sales console, as a standalone React app: a dealer
uploads a CRM lead export, maps its columns onto our fields, confirms, and watches it sync in -
then sees a real business-at-a-glance snapshot and the outbound opportunities already sitting in
their data.

Just the page and its flow — no console shell, sidebar, or other tabs. Talks to the real backend
per `LEAD_UPLOAD_API.md`; there is no mock mode.

## Flow

```
upload (attach .xlsx)  ──▶  mapping (review/edit)  ──▶  syncing (poll)  ──▶  synced
                                                                              │
                                                        business-at-a-glance KPIs
                                                        + real opportunities table
```

## Run locally

```bash
npm install
npm run dev
# open the printed localhost URL
```

Auth is read from a `?bearer=<token>` query param (decoded client-side for enterpriseId/teamId -
same convention `apps/converse-ai/hooks/use-auth-key.ts` uses in the main console). Without one,
API calls will 401 against the real backend.

## Build

```bash
npm run build      # -> dist/
npm run preview    # serve the built output locally
```

## Project structure

```
index.html              Vite entry (mounts src/main.jsx into #root)
public/
  config.json           public runtime config (apiBaseUrl, s3BucketBaseUrl) - no secrets
  404.html
  assets/
    styles.css           Max 2.0 design tokens + the Data Mining CSS
    fonts.css             @font-face -> inter.woff2
    inter.woff2           Inter variable font (self-hosted)
src/
  main.jsx               ReactDOM root
  App.jsx                state machine (upload -> mapping -> syncing -> synced/error)
  lib/
    config.js             runtime config + bearer-decode (fetches public/config.json)
    api.js                API client - always hits the real backend
    icons.jsx              inline SVG icon set as an <Icon> component
  components/
    UploadScreen.jsx
    MappingScreen.jsx
    SyncingScreen.jsx
    SyncedScreen.jsx
    BusinessSnapshot.jsx   post-sync KPI strip + real opportunities table
    ErrorScreen.jsx
```

## APIs this calls

All against `config.leadUpload.apiBaseUrl` (see `public/config.json`), bearer-authed:

- `GET /integrations/lead-uploads/master-fields` - field catalogue for the mapper
- `POST /integrations/lead-uploads/mapping/analyze` - propose a mapping (commits nothing)
- `POST /integrations/lead-uploads` - confirm the mapping, queue the run
- `GET /integrations/lead-uploads/{flowId}/status` - poll until terminal
- `POST /conversation/campaign/presigned-url` + S3 PUT - upload the file
- `GET /conversation/campaign-builder/data-mining/report` - business-at-a-glance KPIs
- `POST /conversation/campaign-builder/data-mining/sync` + `GET .../opportunities` - real
  opportunities, polled until `poll:false`

See `LEAD_UPLOAD_API.md` for the full contract.

## Deploying

Type A (static frontend), bundler variant - see `code-build.yaml` / `code-deploy.yaml` and the
Spyne AWS Infrastructure Onboarding doc, §3b. `public/config.json` is per-branch: `aws-uat` and
`aws-prod` each need their own committed values pointing at the right backend/bucket.

## Design notes

- Max 2.0 / Spyne brand: `#4600F2`, Inter, light theme, inline SVG icons (no emoji).
- Self-hosted variable Inter (`public/assets/inter.woff2`) as one `@font-face` (`font-weight:100 900`).
- Accessible: `aria-live` on the mount, focus-visible rings, `prefers-reduced-motion` respected.
