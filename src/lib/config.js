/* ============================================================================
 * Data Mining — runtime config (ES module port of the old src/config.js +
 * the bearer-decode/config.json-fetch block that lived at the top of
 * src/app.js).
 *
 * `config` is a plain mutable object, not React state — api.js reads
 * config.leadUpload.* at call time (inside each request, not at import
 * time), so the async config.json override below applies correctly even
 * though nothing here is reactive.
 * ==========================================================================*/

// Local-dev defaults. On a real deploy, the fetch below overrides
// apiBaseUrl/s3BucketBaseUrl from the repo-root config.json (Spyne AWS
// platform convention, Infrastructure Onboarding §5a), so each branch's
// committed config.json (UAT vs prod host) wins without a code change.
export const config = {
  leadUpload: {
    apiBaseUrl: 'https://uat-api.spyne.xyz',
    bearerToken: '',
    s3BucketBaseUrl: 'https://spyne-uat-convert-ai.s3.us-east-1.amazonaws.com',
  },
};

/** Fallback only: decodes an old-style `?bearer=` value, either a full JWT
 * (decode the middle segment) or a bare base64url JSON payload. Supports
 * both camelCase and snake_case id fields. Not needed on the real console
 * embedding contract below, which passes enterprise_id/team_id directly. */
function decodeBearerPayload(bearer) {
  try {
    let decoded;
    if (bearer.includes('.')) {
      const parts = bearer.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT format');
      decoded = atob(parts[1]);
    } else {
      let b64 = bearer.replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4;
      if (pad) b64 += '='.repeat(4 - pad);
      decoded = atob(b64);
    }
    const payload = JSON.parse(decoded);
    return {
      enterpriseId: payload.enterpriseId || payload.enterprise_id,
      teamId: payload.teamId || payload.team_id,
    };
  } catch (err) {
    console.error('Error decoding bearer:', err);
    return {};
  }
}

// `env` is the authoritative signal for which backend to hit - it comes
// from the console doing the embedding, not from a per-branch file, so it
// must win over config.json below rather than get overwritten by it.
const ENV_API_BASE_URL = {
  prod: 'https://api.spyne.ai',
  uat: 'https://uat-api.spyne.xyz',
};

const qp = new URLSearchParams(window.location.search);

// Real console embedding contract:
//   ?env=prod|uat&enterprise_id=<id>&team_id=<id>&serviceType=sales|service&token=<bearer>
// enterprise_id/team_id arrive as their own params - no decode needed. token
// is the bearer credential only. Old `?bearer=<jwt-or-payload>` and
// `?enterpriseId=`/`?teamId=` are kept as a fallback for manual test links
// already in circulation.
const TOKEN = qp.get('token') || qp.get('bearer') || '';
const directEnterpriseId = qp.get('enterprise_id') || qp.get('enterpriseId');
const directTeamId = qp.get('team_id') || qp.get('teamId');
const decoded = (!directEnterpriseId || !directTeamId) && TOKEN ? decodeBearerPayload(TOKEN) : {};

export const ENTERPRISE_ID = directEnterpriseId || decoded.enterpriseId || '';
export const TEAM_ID = directTeamId || decoded.teamId || '';
export const ENV = qp.get('env') || '';
export const SERVICE_TYPE = qp.get('serviceType') || 'sales';

config.leadUpload.bearerToken = TOKEN;
if (ENV_API_BASE_URL[ENV]) config.leadUpload.apiBaseUrl = ENV_API_BASE_URL[ENV];

// Fire-and-forget - resolves well before the user can trigger a real API
// call, and if it 404s (e.g. local dev without the file) the hardcoded/env
// defaults above stand. Only a fallback for when this page is opened
// without going through the console (no `?env=`) - env, when present,
// already decided apiBaseUrl above and must not be clobbered here.
fetch('/config.json')
  .then((r) => (r.ok ? r.json() : null))
  .then((cfg) => {
    if (!cfg) return;
    if (!ENV_API_BASE_URL[ENV] && cfg.apiBaseUrl) config.leadUpload.apiBaseUrl = cfg.apiBaseUrl;
    if (cfg.s3BucketBaseUrl) config.leadUpload.s3BucketBaseUrl = cfg.s3BucketBaseUrl;
  })
  .catch(() => {});
