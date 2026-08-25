/* ============================================================================
 * Data Mining — runtime config
 *
 * Always calls the real backend now — there is no mock mode. The three
 * legacy scan endpoints (createScan/getScanSteps/getResults in src/api.js)
 * are dead code, kept only for reference; set `apiBaseUrl` if you ever wire
 * them back in.
 *
 * These leadUpload values are local-dev defaults only. On a real deploy,
 * app.js fetches the repo-root config.json (Spyne AWS platform convention -
 * see Infrastructure Onboarding §5a) and overrides apiBaseUrl/s3BucketBaseUrl
 * from it, so each branch's committed config.json (UAT vs prod host) wins
 * without a code change. If that fetch fails (e.g. plain file:// testing),
 * these hardcoded values are what's actually used.
 * ==========================================================================*/
window.DM_CONFIG = {
  apiBaseUrl: '/api/data-mining',// e.g. 'https://console.spyne.ai/api/data-mining'
  // Tunables for the analyzing animation (ms). Purely cosmetic. Unused now
  // that the legacy analyzing screen is dead code, kept for reference.
  analyze: { startDelay: 560, stepMin: 640, stepDone: 820 },

  // Lead-uploads integration (see LEAD_UPLOAD_API.md). Same backend host
  // serves both the presigned-url call and /integrations/lead-uploads/* -
  // one gateway, different path prefixes - matching the main Spyne console.
  // `bearerToken` is left blank here on purpose: app.js overwrites it at
  // load time from the page's own `?bearer=` query param, the same
  // iframe-embedding convention apps/converse-ai/hooks/use-auth-key.ts uses
  // in the main console.
  leadUpload: {
    apiBaseUrl: 'https://uat-api.spyne.xyz',
    bearerToken: '',
    s3BucketBaseUrl: 'https://spyne-uat-convert-ai.s3.us-east-1.amazonaws.com',
  },
};
