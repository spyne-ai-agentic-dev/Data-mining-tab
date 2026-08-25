/* ============================================================================
 * Data Mining API client. Always calls the real backend — no mock mode.
 *
 * createScan / getScanSteps / getResults below implement the original 3-call
 * scan contract (multipart upload -> fake progress checklist -> health-check
 * report). They're kept intact but are no longer called from app.js - the
 * live flow now goes through the lead-uploads methods further down instead.
 * Left in place in case the health-check report is wired back in later.
 *
 *   POST  {base}/scans                      body: multipart form (lead, activity files)
 *         -> 202 { "scanId": "abc123" }
 *
 *   GET   {base}/scans/{scanId}/steps       (progress checklist for the animation)
 *         -> 200 [ [label, value, valueClass, detail], ... ]
 *
 *   GET   {base}/scans/{scanId}/results     (the full report)
 *         -> 200 { dealer, headline, profile, sources, math, ramp, payoff,
 *                  opportunities, reconciliation, cta }
 *
 * Lead-uploads methods (uploadFileToS3 / getMasterFields / analyzeMapping /
 * confirmMapping / getSyncStatus) implement the real flow per
 * LEAD_UPLOAD_API.md against DM_CONFIG.leadUpload.apiBaseUrl. Auth for those
 * is read from DM_CONFIG.leadUpload.bearerToken, which app.js populates at
 * load time from the page's own `?bearer=` query param.
 *
 * Errors reject; app.js shows a friendly retry.
 * ==========================================================================*/
(function () {
  const base = () => (window.DM_CONFIG.apiBaseUrl || '').replace(/\/$/, '');

  async function getJSON(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    return res.json();
  }

  /* ---- Lead-uploads integration (LEAD_UPLOAD_API.md) ----
   * Separate base URL from the Data Mining scan API above - this is the
   * `{HOST}/integrations` service (same gateway as the presigned-url call,
   * different path prefix). Every route needs Authorization: Bearer. */
  const leadBase = () => (window.DM_CONFIG.leadUpload.apiBaseUrl || '').replace(/\/$/, '');
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${window.DM_CONFIG.leadUpload.bearerToken || ''}`,
  });

  async function getLeadJSON(path) {
    const res = await fetch(`${leadBase()}${path}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
    return res.json();
  }
  async function postLeadJSON(path, body) {
    const res = await fetch(`${leadBase()}${path}`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
    });
    return res; // caller reads .ok/.status - confirm needs the raw response
  }

  window.DM_API = {
    /**
     * Kick off a scan. `files` = { lead: File|null, activity: File|null }.
     * Returns { scanId }.
     */
    async createScan(files) {
      const fd = new FormData();
      Object.entries(files || {}).forEach(([k, f]) => { if (f) fd.append(k, f); });
      const res = await fetch(`${base()}/scans`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`POST /scans -> ${res.status}`);
      return res.json();
    },

    /** Progress checklist for the analyzing screen. Returns an array of steps. */
    async getScanSteps(scanId) {
      return getJSON(`${base()}/scans/${encodeURIComponent(scanId)}/steps`);
    },

    /** The full results report. Returns the results object. */
    async getResults(scanId) {
      return getJSON(`${base()}/scans/${encodeURIComponent(scanId)}/results`);
    },

    /* ================= Lead-uploads flow (LEAD_UPLOAD_API.md) ================= */

    /**
     * Uploads a file to S3 via a presigned URL and returns a full https:// URL
     * suitable for `s3Key` on analyze - a bare object key is rejected by that
     * endpoint. Same two-step presigned-PUT dance as the main Spyne console:
     * ask the backend for a presigned URL, PUT the file to it, then take the
     * bucket-relative key the backend hands back and prefix it with the
     * bucket's own base URL to get a full URL.
     */
    async uploadFileToS3(file) {
      const presignRes = await postLeadJSON('/conversation/campaign/presigned-url', {
        fileName: file.name, fileType: file.type || 'application/octet-stream',
      });
      if (!presignRes.ok) throw new Error(`POST /presigned-url -> ${presignRes.status}`);
      const presign = await presignRes.json();
      const presignedUploadUrl = presign.presignedUploadUrl || (presign.data && presign.data.presignedUploadUrl);
      if (!presignedUploadUrl) throw new Error('No presignedUploadUrl in response');

      const putRes = await fetch(presignedUploadUrl, { method: 'PUT', body: file });
      if (!putRes.ok) throw new Error(`PUT to S3 -> ${putRes.status}`);

      const rawKey = presign.s3Path || (presign.data && presign.data.s3Path) || presignedUploadUrl.split('?')[0];
      return /^(https?:\/\/|s3:\/\/)/.test(rawKey)
        ? rawKey
        : `${window.DM_CONFIG.leadUpload.s3BucketBaseUrl}/${rawKey}`;
    },

    /** GET /lead-uploads/master-fields - the mapper's field catalogue. */
    async getMasterFields() {
      return getLeadJSON('/integrations/lead-uploads/master-fields');
    },

    /**
     * POST /lead-uploads/mapping/analyze - proposes a mapping. Commits nothing.
     * `files` = [{ s3Key }] - this flow only ever sends a single file.
     */
    async analyzeMapping({ enterpriseId, teamId, providerName, providerLabel, files }) {
      const res = await postLeadJSON('/integrations/lead-uploads/mapping/analyze', {
        enterpriseId, teamId, providerName, providerLabel, files,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body && body.message) || `POST /mapping/analyze -> ${res.status}`);
      }
      return res.json();
    },

    /**
     * POST /lead-uploads - confirms the mapping and queues the run.
     * Returns { ok:true, data:{flowId,...} } on 202, or
     * { ok:false, status, error } on 404/422/503 - callers branch on `.ok`
     * rather than catching, since a 422 is a normal, expected outcome here.
     */
    async confirmMapping({ mappingKey, overrides, keepUnmapped, acknowledgeWarnings, confirmedBy }) {
      const res = await postLeadJSON('/integrations/lead-uploads', {
        mappingKey, overrides, keepUnmapped, acknowledgeWarnings, confirmedBy,
      });
      if (res.ok) return { ok: true, data: await res.json() };
      const error = await res.json().catch(() => null);
      return { ok: false, status: res.status, error };
    },

    /** GET /lead-uploads/{flowId}/status - poll `state`, not `phase`. */
    async getSyncStatus(flowId) {
      return getLeadJSON(`/integrations/lead-uploads/${encodeURIComponent(flowId)}/status`);
    },

    /* ============ Data-mining snapshot (post-sync "business at a glance") ============
     * Separate from the lead-uploads flow above - same host, `/conversation/campaign-builder`
     * prefix instead of `/integrations/lead-uploads`. Not tied to a specific upload's flowId;
     * reflects whatever leads already exist for this team. */

    /** GET .../data-mining/report - the KPI strip (totalLeads, leadsPerMonth, etc). */
    async getDataMiningReport() {
      return getLeadJSON('/conversation/campaign-builder/data-mining/report');
    },

    /** POST .../data-mining/sync - kicks off opportunity computation. No body. */
    async triggerDataMiningSync() {
      const res = await postLeadJSON('/conversation/campaign-builder/data-mining/sync');
      if (!res.ok) throw new Error(`POST /data-mining/sync -> ${res.status}`);
      return res.json();
    },

    /** GET .../data-mining/opportunities - poll while `poll:true`, stop once false. */
    async getDataMiningOpportunities() {
      return getLeadJSON('/conversation/campaign-builder/data-mining/opportunities');
    },
  };
})();
