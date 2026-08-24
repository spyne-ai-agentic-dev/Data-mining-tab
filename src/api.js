/* ============================================================================
 * Data Mining API client.
 *
 * One place to swap sample data for the real backend. Set DM_CONFIG.useMock
 * = false and DM_CONFIG.apiBaseUrl, then implement these three endpoints:
 *
 *   POST  {base}/scans                      body: multipart form (lead, activity files)
 *         -> 202 { "scanId": "abc123" }
 *
 *   GET   {base}/scans/{scanId}/steps       (progress checklist for the animation)
 *         -> 200 [ [label, value, valueClass, detail], ... ]   // see DM_MOCK.steps
 *
 *   GET   {base}/scans/{scanId}/results     (the full report)
 *         -> 200 { dealer, headline, profile, sources, math, ramp, payoff,
 *                  opportunities, reconciliation, cta }         // see DM_MOCK.results
 *
 * Every method returns a Promise resolving to the shapes in src/mock.js.
 * Errors reject; app.js shows a friendly retry.
 * ==========================================================================*/
(function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const base = () => (window.DM_CONFIG.apiBaseUrl || '').replace(/\/$/, '');

  async function getJSON(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    return res.json();
  }

  window.DM_API = {
    /**
     * Kick off a scan. `files` = { lead: File|null, activity: File|null }.
     * Returns { scanId }.
     */
    async createScan(files) {
      if (window.DM_CONFIG.useMock) {
        await sleep(250);
        return { scanId: 'zeigler-sample' };
      }
      const fd = new FormData();
      Object.entries(files || {}).forEach(([k, f]) => { if (f) fd.append(k, f); });
      const res = await fetch(`${base()}/scans`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`POST /scans -> ${res.status}`);
      return res.json();
    },

    /** Progress checklist for the analyzing screen. Returns an array of steps. */
    async getScanSteps(scanId) {
      if (window.DM_CONFIG.useMock) { await sleep(120); return window.DM_MOCK.steps; }
      return getJSON(`${base()}/scans/${encodeURIComponent(scanId)}/steps`);
    },

    /** The full results report. Returns the results object. */
    async getResults(scanId) {
      if (window.DM_CONFIG.useMock) { await sleep(150); return window.DM_MOCK.results; }
      return getJSON(`${base()}/scans/${encodeURIComponent(scanId)}/results`);
    },
  };
})();
