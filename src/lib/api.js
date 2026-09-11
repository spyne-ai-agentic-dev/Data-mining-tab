/* ============================================================================
 * Data Mining API client. Always calls the real backend — no mock mode.
 *
 * Lead-uploads methods (uploadFileToS3 / getMasterFields / analyzeMapping /
 * confirmMapping / getSyncStatus) implement the real flow per
 * LEAD_UPLOAD_API.md against config.leadUpload.apiBaseUrl. Auth for those is
 * read from config.leadUpload.bearerToken (see lib/config.js).
 *
 * Data-mining snapshot methods (getDataMiningReport / triggerDataMiningSync /
 * getDataMiningOpportunities) hit a separate `/conversation/campaign-builder`
 * prefix on the same host - not tied to a specific upload's flowId, they
 * reflect whatever leads already exist for this team.
 *
 * Errors reject; the UI shows a friendly retry.
 * ==========================================================================*/
import { config } from './config.js';

const leadBase = () => (config.leadUpload.apiBaseUrl || '').replace(/\/$/, '');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${config.leadUpload.bearerToken || ''}`,
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

export const api = {
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
      : `${config.leadUpload.s3BucketBaseUrl}/${rawKey}`;
  },

  /** GET /lead-uploads/master-fields - the mapper's field catalogue. */
  async getMasterFields() {
    return getLeadJSON('/integrations/lead-uploads/master-fields');
  },

  /**
   * GET /integrations/internal/lead-uploads/team-status - which CRM (if
   * any) is connected for this team, and when the last manual upload
   * landed. `crm` is null when no CRM is connected.
   */
  async getTeamStatus({ enterpriseId, teamId }) {
    const params = new URLSearchParams({ teamId, enterpriseId });
    return getLeadJSON(`/integrations/internal/lead-uploads/team-status?${params.toString()}`);
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
   * POST /lead-uploads - confirms the mapping and queues the run. `overrides`
   * is gone (CSV_ANALYZE_CHANGES.md) - the server ignores it now.
   * Returns { ok:true, data:{flowId,...} } on 202, or
   * { ok:false, status, error } on 404/422/503 - callers branch on `.ok`
   * rather than catching, since a 422 is a normal, expected outcome here.
   */
  async confirmMapping({ mappingKey, keepUnmapped, acknowledgeWarnings, confirmedBy }) {
    const res = await postLeadJSON('/integrations/lead-uploads', {
      mappingKey, keepUnmapped, acknowledgeWarnings, confirmedBy,
    });
    if (res.ok) return { ok: true, data: await res.json() };
    const error = await res.json().catch(() => null);
    return { ok: false, status: res.status, error };
  },

  /** GET /lead-uploads/{flowId}/status - poll `state`, not `phase`. */
  async getSyncStatus(flowId) {
    return getLeadJSON(`/integrations/lead-uploads/${encodeURIComponent(flowId)}/status`);
  },

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

  /**
   * POST /integrations/data-ingestion/manual-upload - direct multipart file
   * upload, no S3 presign step first (this endpoint takes the raw file
   * itself, unlike the lead-uploads flow above). Needs XMLHttpRequest rather
   * than fetch - fetch has no cross-browser upload-progress event, and the
   * modal shows a real percentage.
   */
  manualUpload({ file, enterpriseId, teamId, department, onProgress }) {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('enterpriseId', enterpriseId);
      fd.append('teamId', teamId);
      fd.append('department', department);
      fd.append('provider', 'spyne');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${leadBase()}/integrations/data-ingestion/manual-upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${config.leadUpload.bearerToken || ''}`);
      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText || '{}')); } catch { resolve({}); }
        } else {
          reject(new Error(`POST /manual-upload -> ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(fd);
    });
  },
};
