/* ============================================================================
 * Data Mining — app (state machine + views).
 *
 * Flow:  upload (attach) -> mapping -> syncing -> synced   (error fallback)
 * This replaces the old upload(2 CSVs)->analyzing->results scan flow with the
 * real lead-uploads pipeline (LEAD_UPLOAD_API.md): attach one .xlsx, propose
 * a mapping, let the operator review/edit it, confirm, then poll real sync
 * status.
 *
 * Auth: this page is embedded the same way apps/converse-ai is elsewhere in
 * the Spyne console — a `?bearer=<token>` query param, decoded client-side
 * to pull enterpriseId/teamId straight out of its payload. See
 * apps/converse-ai/hooks/use-auth-key.ts in the main monorepo for the
 * original; decodeBearerPayload() below is the same logic. Separate
 * `enterpriseId`/`teamId` query params are still accepted as a fallback for
 * manual testing without a real token.
 *
 * The old scan-flow view code (viewAnalyzing/mountAnalyzing/animateSteps,
 * viewResults/mountResults/oppRows) is kept below, verbatim, but no longer
 * reachable from render() — nothing currently produces a scanId to feed it.
 * Left in place in case the health-check report gets wired back in later
 * rather than deleted outright.
 *
 * All dynamic content comes from DM_API, which always hits the real backend.
 * The views only render; they never hold data beyond `state`.
 * ==========================================================================*/
(function () {
  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const mount = $('#content');

  const qp = new URLSearchParams(location.search);

  /** Same decode as apps/converse-ai/hooks/use-auth-key.ts: a bearer is
   * either a full JWT (decode the middle segment) or a bare base64url JSON
   * payload. Supports both camelCase and snake_case id fields. */
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

  const BEARER = qp.get('bearer') || '';
  const bearerPayload = BEARER ? decodeBearerPayload(BEARER) : {};
  const ENTERPRISE_ID = bearerPayload.enterpriseId || qp.get('enterpriseId') || '';
  const TEAM_ID = bearerPayload.teamId || qp.get('teamId') || '';

  // api.js reads the token from here on every lead-uploads call.
  window.DM_CONFIG.leadUpload.bearerToken = BEARER;

  // Platform convention (Infrastructure Onboarding §5a): public, non-secret
  // runtime config lives in a repo-root config.json so each deployed branch
  // can point at its own API host without a code change. Fire-and-forget -
  // it resolves well before the user can trigger a real API call, and if it
  // 404s (e.g. running straight off the filesystem) the hardcoded defaults
  // in config.js stand.
  fetch('./config.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((cfg) => {
      if (!cfg) return;
      if (cfg.apiBaseUrl) window.DM_CONFIG.leadUpload.apiBaseUrl = cfg.apiBaseUrl;
      if (cfg.s3BucketBaseUrl) window.DM_CONFIG.leadUpload.s3BucketBaseUrl = cfg.s3BucketBaseUrl;
    })
    .catch(() => {});

  const state = {
    name: 'upload',           // upload | mapping | syncing | synced | error
    error: null,

    // upload (attach)
    fileObj: null,             // real File object for the API
    fileName: null,            // display label
    attachError: null,

    // mapping
    mappingLoading: false,
    mappingKey: null,
    fileKey: null,             // fileKey the analyze response assigned to our one file
    masterFields: [],          // GET /master-fields .fields
    analyzedColumns: [],       // analyze response .files[0].columns
    overrides: {},             // header -> mappedField|null, only user-changed bindings
    blocking: [],
    warnings: [],
    confirmLoading: false,
    confirmError: null,

    // syncing
    flowId: null,
    syncStatus: null,          // latest poll response

    // synced
    finalStatus: null,         // terminal poll response
    snapshotLoading: false,    // true while report + sync-trigger + opportunities poll are in flight
    snapshotError: null,
    report: null,              // GET .../data-mining/report
    opportunities: [],         // GET .../data-mining/opportunities .opportunities
    opportunitiesTotal: 0,
    opportunitiesCompleted: 0,

    // --- legacy scan-flow fields, kept for the dead code below ---
    scanId: null,
    results: null,
    sample: false,
  };

  function resetToUpload() {
    Object.assign(state, {
      name: 'upload', error: null,
      fileObj: null, fileName: null, attachError: null,
      mappingLoading: false, mappingKey: null, fileKey: null,
      masterFields: [], analyzedColumns: [], overrides: {},
      blocking: [], warnings: [], confirmLoading: false, confirmError: null,
      flowId: null, syncStatus: null, finalStatus: null,
      snapshotLoading: false, snapshotError: null, report: null,
      opportunities: [], opportunitiesTotal: 0, opportunitiesCompleted: 0,
    });
  }

  function fmtSize(b) { return b > 1e6 ? (b/1e6).toFixed(1)+' MB' : Math.round(b/1e3)+' KB'; }

  /* ============================ UPLOAD (attach) ============================ */
  function viewUpload() {
    const hasFile = !!state.fileObj;
    return `
      <div class="page-head"><div><div class="page-eyebrow">Sales</div><div class="page-title">Data Mining</div>
        <div class="page-desc">Upload your CRM lead export. We map its columns onto our fields, you confirm, then it syncs in — no CSV wrangling, no guesswork.</div></div></div>
      <div class="card up-hero"><div class="up-hero-inner">
        <div class="eyebrow">Free business health check &middot; normally $99</div>
        <h2>See the appointments already hiding in your data</h2>
        <p>We do not send anything to your customers. This is a read-only look at what your outbound AI agent could recover from leads you have already paid for.</p>
        <div class="up-steps">
          <span class="up-step"><span class="n">1</span> Attach your file</span>
          <span class="up-step"><span class="n">2</span> Map its columns</span>
          <span class="up-step"><span class="n">3</span> Confirm &amp; sync</span>
        </div>
      </div></div>
      <div class="drop-grid one">
        <div class="drop ${hasFile ? 'done' : ''}" data-zone="lead">
          <div class="dh"><span class="di">${ic(hasFile ? 'check_circle' : 'file', 'ic ic-lg')}</span>
            <div><h4>Lead export</h4><div class="req">Required &middot; .xlsx only</div></div></div>
          ${hasFile
            ? `<div class="doneline">${ic('check_circle','ic ic-18')} ${state.fileName}</div>`
            : `<div class="act"><button class="btn sec sm" id="pickFile">${ic('cloud_upload','ic ic-sm')} Choose file</button></div>`}
          <input type="file" accept=".xlsx" id="fileInput" hidden>
        </div>
      </div>
      ${state.attachError ? `<div class="helpbox err" style="margin-top:14px">${ic('warning','ic')}<p>${state.attachError}</p></div>` : ''}
      <div class="up-foot">
        <button class="btn lg" id="continueBtn" ${hasFile ? '' : 'disabled'}>${ic('scan','ic')} Continue to mapping</button>
        <span class="trust">${ic('shield','ic ic-18')} Read-only &middot; encrypted</span>
      </div>`;
  }
  function mountUpload() {
    const drop = $('.drop[data-zone="lead"]');
    const inp = $('#fileInput');
    const openPicker = () => inp && inp.click();
    if (!state.fileObj && drop) {
      drop.style.cursor = 'pointer';
      drop.onclick = (e) => { if (e.target.closest('#pickFile')) return; openPicker(); };
    }
    const pickBtn = $('#pickFile');
    if (pickBtn) pickBtn.onclick = (e) => { e.stopPropagation(); openPicker(); };
    if (inp) inp.onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (!/\.xlsx$/i.test(f.name)) { state.attachError = 'Only .xlsx files are supported.'; render(); return; }
      state.fileObj = f;
      state.fileName = `${f.name} · ${fmtSize(f.size)}`;
      state.attachError = null;
      render();
    };
    const cont = $('#continueBtn');
    if (cont) cont.onclick = () => { if (state.fileObj) goToMapping(); };
  }

  async function goToMapping() {
    state.name = 'mapping';
    state.mappingLoading = true;
    state.mappingKey = null; state.fileKey = null;
    state.analyzedColumns = []; state.overrides = {};
    state.blocking = []; state.warnings = []; state.confirmError = null;
    render();
    try {
      const s3Key = await window.DM_API.uploadFileToS3(state.fileObj);
      const [mf, az] = await Promise.all([
        window.DM_API.getMasterFields(),
        window.DM_API.analyzeMapping({
          enterpriseId: ENTERPRISE_ID,
          teamId: TEAM_ID,
          providerName: 'other',
          providerLabel: 'CRM export',
          files: [{ s3Key }],
        }),
      ]);
      state.masterFields = mf.fields || [];
      const file = (az.files || [])[0] || { fileKey: '', columns: [] };
      state.fileKey = file.fileKey;
      state.analyzedColumns = file.columns || [];
      state.blocking = az.blocking || [];
      state.warnings = az.warnings || [];
      state.mappingKey = az.mappingKey;
      state.mappingLoading = false;
      render();
    } catch (err) {
      state.error = err.message || String(err);
      state.name = 'error';
      render();
    }
  }

  /* ============================ MAPPING ============================ */
  const MATCH_LABEL = { EXACT:'exact match', SUBSTRING:'partial match', LLM:'AI match', MANUAL:'manual', NONE:'' };

  function fieldColumn(fieldKey) {
    for (const col of state.analyzedColumns) {
      const hasOverride = Object.prototype.hasOwnProperty.call(state.overrides, col.header);
      const effective = hasOverride ? state.overrides[col.header] : col.mappedField;
      if (effective === fieldKey) return col;
    }
    return null;
  }
  const isFieldMapped = (fieldKey) => !!fieldColumn(fieldKey);

  function viewMapping() {
    if (state.mappingLoading) {
      return `<div class="an-wrap">
        <div class="an-orb">${ic('scan','ic ic-xl')}</div>
        <h2>Reading your file</h2>
        <div class="sub">Uploading and matching columns against our field catalogue.</div>
      </div>`;
    }

    const matched = state.analyzedColumns.filter((c) => {
      const hasOverride = Object.prototype.hasOwnProperty.call(state.overrides, c.header);
      return hasOverride ? !!state.overrides[c.header] : !!c.mappedField;
    }).length;

    const consentCard = (key, label, icon, onCopy, offCopy) => {
      const on = isFieldMapped(key);
      return `<div class="consent-card ${on ? 'on' : ''}">
        <div class="cc-head">${ic(icon,'ic ic-sm')}<b>${label}</b>${on ? '' : '<span class="cc-off">&middot; off</span>'}</div>
        <p>${on ? onCopy : offCopy}</p>
      </div>`;
    };

    const optionsHtml = () => `<option value="">Not mapped</option>` +
      state.analyzedColumns.map((c) => `<option value="${c.header}">${c.header}</option>`).join('');

    const rows = state.masterFields.map((f) => {
      const col = fieldColumn(f.key);
      const isGate = f.critical;
      const isUnmapped = isGate && !col;
      return `<tr class="${isUnmapped ? 'gate-empty' : ''}">
        <td><b>${f.label}</b> ${isGate ? '<span class="chip w">GATE</span>' : (f.required ? '<span class="chip n">REQ</span>' : '')}</td>
        <td>
          <select data-field="${f.key}" class="mapsel ${isUnmapped ? 'err' : ''}">${optionsHtml()}</select>
          ${col ? `<div class="mapmeta">${MATCH_LABEL[col.matchKind] || ''}</div>` : ''}
        </td>
        <td class="mapwhat">${f.description}</td>
      </tr>`;
    }).join('');

    return `
      <div class="page-head"><div><div class="page-eyebrow">Sales</div><div class="page-title">Data Mining</div>
        <div class="page-desc">Map their columns to our fields. Their names are not ours — this is what makes the opportunity math portable.</div></div></div>

      <div class="card pad" style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <b>${matched} of ${state.analyzedColumns.length} matched automatically</b>
          <button class="reset-link" id="rerunAnalyze">${ic('refresh','ic ic-sm')} Re-run auto-detect</button>
        </div>
      </div>

      ${state.blocking.length ? `<div class="helpbox err" style="margin-bottom:14px">${ic('warning','ic')}<div><b>Fix these before confirming:</b>${state.blocking.map((b) => `<p>${b.message}</p>`).join('')}</div></div>` : ''}
      ${state.warnings.length ? `<div class="helpbox warn" style="margin-bottom:14px">${ic('warning','ic')}<div>${state.warnings.map((w) => `<p>${w.message}</p>`).join('')}</div></div>` : ''}

      <div class="consent-grid">
        ${consentCard('consent_call','Calling','phone','Do-not-call respected on every dial','No consent column — calls will not be gated')}
        ${consentCard('consent_sms','SMS','forum','Text steps run','No consent column — SMS steps are skipped')}
        ${consentCard('consent_email','Email','mail','Email steps run','Email steps skipped — calls still run')}
      </div>

      <div class="card" style="overflow:hidden;margin-top:14px">
        <table class="maptable">
          <thead><tr><th>Our field</th><th>Their column</th><th>What it drives</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      ${state.confirmError ? `<div class="helpbox err" style="margin-top:14px">${ic('warning','ic')}<p>${state.confirmError}</p></div>` : ''}
      <div class="up-foot">
        <button class="reset-link" id="backToUpload">&larr; Back</button>
        <span style="flex:1"></span>
        <button class="btn lg" id="confirmBtn" ${(!state.mappingKey || state.blocking.length || state.confirmLoading) ? 'disabled' : ''}>
          ${ic('rocket','ic ic-sm')} ${state.confirmLoading ? 'Confirming…' : 'Confirm & sync'}
        </button>
      </div>`;
  }

  function mountMapping() {
    if (state.mappingLoading) return;
    $$('.mapsel').forEach((sel) => {
      const col = fieldColumn(sel.dataset.field);
      sel.value = col ? col.header : '';
      sel.onchange = (e) => {
        const fieldKey = sel.dataset.field;
        const newHeader = e.target.value;
        const prevCol = fieldColumn(fieldKey);
        if (prevCol && prevCol.header !== newHeader) state.overrides[prevCol.header] = null;
        if (newHeader) state.overrides[newHeader] = fieldKey; // supersedes any other field that held this column
        render();
      };
    });
    const back = $('#backToUpload'); if (back) back.onclick = () => { state.name = 'upload'; render(); };
    const rerun = $('#rerunAnalyze'); if (rerun) rerun.onclick = () => goToMapping();
    const confirmBtn = $('#confirmBtn'); if (confirmBtn) confirmBtn.onclick = () => confirmAndSync();
  }

  function buildOverridesPayload() {
    return Object.keys(state.overrides).map((header) => ({
      fileKey: state.fileKey, header, mappedField: state.overrides[header],
    }));
  }

  async function confirmAndSync() {
    if (!state.mappingKey || state.blocking.length) return;
    state.confirmLoading = true; state.confirmError = null; render();
    const result = await window.DM_API.confirmMapping({
      mappingKey: state.mappingKey,
      overrides: buildOverridesPayload(),
    });
    state.confirmLoading = false;
    if (result.ok) {
      state.flowId = result.data.flowId;
      state.name = 'syncing';
      state.syncStatus = null;
      render();
      pollSyncStatus();
    } else {
      state.confirmError = (result.error && result.error.message) ||
        (result.status === 404 ? 'This mapping expired — re-run auto-detect and try again.' : 'Could not confirm the upload.');
      render();
    }
  }

  /* ============================ SYNCING ============================ */
  const SYNC_TERMINAL = new Set(['completed', 'completed_with_failures', 'failed']);

  function viewSyncing() {
    const s = state.syncStatus || {};
    const processed = s.processed || 0, total = s.total || 0;
    const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
    return `<div class="an-wrap">
      <div class="an-orb">${ic('scan','ic ic-xl')}</div>
      <h2>Syncing your leads</h2>
      <div class="sub">The raw file and mapping are with the backend. We poll it for status; the count climbing is the poll.</div>
      <div class="an-prog"><div class="fill" style="width:${pct}%"></div></div>
      <div style="font-size:13px;color:var(--text-2)">${processed.toLocaleString()} of ${total.toLocaleString()} rows &middot; ${pct}%</div>
    </div>`;
  }
  function mountSyncing() { /* nothing to wire — pollSyncStatus drives re-renders */ }

  async function pollSyncStatus() {
    try {
      const status = await window.DM_API.getSyncStatus(state.flowId);
      state.syncStatus = status;
      if (SYNC_TERMINAL.has(status.state)) {
        state.finalStatus = status;
        state.name = 'synced';
        render();
        // Only worth a snapshot if something actually landed - a hard failure
        // (state.error path below already handled) has nothing to report on.
        if (status.state !== 'failed') loadBusinessSnapshot();
        return;
      }
      render();
      setTimeout(pollSyncStatus, 2000);
    } catch (err) {
      state.error = err.message || String(err);
      state.name = 'error';
      render();
    }
  }

  /* ============================ BUSINESS SNAPSHOT (post-sync) ============================
   * Separate from the lead-uploads flow above - reflects the team's whole lead book, not just
   * this upload. `report` is a plain GET; opportunities need a POST to trigger computation,
   * then polling until the response says `poll:false`. */

  async function loadBusinessSnapshot() {
    state.snapshotLoading = true;
    state.snapshotError = null;
    render();
    try {
      const [report] = await Promise.all([
        window.DM_API.getDataMiningReport(),
        window.DM_API.triggerDataMiningSync(),
      ]);
      state.report = report;
      render();
      await pollOpportunities();
    } catch (err) {
      state.snapshotLoading = false;
      state.snapshotError = err.message || String(err);
      render();
    }
  }

  async function pollOpportunities() {
    try {
      const data = await window.DM_API.getDataMiningOpportunities();
      state.opportunities = data.opportunities || [];
      state.opportunitiesTotal = data.total || 0;
      state.opportunitiesCompleted = data.completed || 0;
      if (data.poll) {
        render();
        setTimeout(pollOpportunities, 2000);
        return;
      }
      state.snapshotLoading = false;
      render();
    } catch (err) {
      state.snapshotLoading = false;
      state.snapshotError = err.message || String(err);
      render();
    }
  }

  /* ============================ SYNCED ============================ */
  const FAILURE_LABEL = {
    MISSING_REQUIRED_FIELD: "No lead id and no phone — the row can't be matched on re-upload",
    INVALID_PHONE: 'Phone invalid after normalisation',
    DUPLICATE_KEY_IN_FILE: 'Duplicate Lead ID inside the file',
    JOIN_UNMATCHED: 'No match in a required join file',
    JOIN_KEY_MISSING: 'The join column was empty on this row',
    UNREADABLE_CONSENT: 'Consent value unreadable — not a yes/no',
    UNPARSEABLE_DATE: 'Date value could not be parsed',
    TYPE_MISMATCH: "Value didn't fit the bound field's type",
    ROOFTOP_MISMATCH: 'Row resolved to a different team',
    DOWNSTREAM_REJECTED: 'The write path refused it',
  };

  function fmtMonthYear(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  /* Icon per opportunity is a pure display choice keyed off name/useCase - no
   * backend field drives it. Never let this imply a stat the API didn't send. */
  function opportunityIcon(o) {
    const n = o.name.toLowerCase();
    if (n.includes('no-show')) return 'repeat';
    if (n.includes('1-2 years') || n.includes('2-3 years')) return 'moon';
    if (n.includes('aged lead')) return 'clock';
    if (n.includes('nps')) return 'trending_up';
    if (n.includes('csat')) return 'check_circle';
    if (n.includes('oem') || n.includes('win-back') || n.includes('custom')) return 'sparkle';
    return 'file';
  }

  function renderBusinessSnapshot() {
    if (state.snapshotError) {
      return `<div class="helpbox err" style="margin-top:14px">${ic('warning','ic')}<p>${state.snapshotError}</p></div>`;
    }
    if (!state.report && state.snapshotLoading) {
      return `<div class="card pad" style="margin-top:14px;display:flex;align-items:center;gap:10px;color:var(--text-2)">
        <span class="spin"></span> Pulling your business snapshot together...
      </div>`;
    }
    if (!state.report) return '';

    const rp = state.report;
    const kpis = [
      { v: (rp.totalLeads || 0).toLocaleString(), k: 'Total leads' },
      { v: (rp.leadsPerMonth || 0).toLocaleString(), k: 'Leads / mo' },
      { v: (rp.soldPerMonth || 0).toLocaleString(), k: 'Sold / mo' },
      { v: (rp.validLeads || 0).toLocaleString(), k: 'Valid leads' },
      { v: (rp.appointmentsPerMonth || 0).toLocaleString(), k: 'Appointments / mo' },
      { v: `${rp.dataSpanMonths || 0} mo`, k: 'Data span', d: `${fmtMonthYear(rp.oldestLeadAt)} - ${fmtMonthYear(rp.newestLeadAt)}` },
    ];

    const autoOpps = state.opportunities
      .filter((o) => o.mode === 'auto')
      .sort((a, b) => (b.count || 0) - (a.count || 0));
    const manualOpps = state.opportunities.filter((o) => o.mode !== 'auto');

    const oppRow = (o, isAuto) => `
      <div class="opptable-row">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <span class="opp-icon">${ic(opportunityIcon(o), 'ic ic-sm')}</span>
          <div>
            <div class="opp-name">${o.name}</div>
            <div class="opp-desc">${o.description}</div>
          </div>
        </div>
        <div class="opp-eligible ${isAuto ? '' : 'dash'}">${isAuto ? (o.count || 0).toLocaleString() : '—'}</div>
        <div class="opp-status">
          ${isAuto
            ? `<span class="chip g"><span class="dot"></span>${o.syncStatus === 'SUCCESS' ? 'Ready' : o.syncStatus}</span>`
            : `<span class="chip n">Needs upload</span>`}
        </div>
      </div>`;

    return `
      <div class="card pad" style="margin-top:14px">
        <div class="sec-head" style="margin-bottom:0">
          <span class="step">1</span><h3>Your business at a glance</h3>
          <span class="note">Measured from your files</span>
        </div>
        <div class="kpi-strip" style="margin-top:16px">
          ${kpis.map((k) => `<div class="kpi"><div class="v num">${k.v}</div><div class="k">${k.k}</div>${k.d ? `<div class="d">${k.d}</div>` : ''}</div>`).join('')}
        </div>
      </div>

      <div class="card" style="margin-top:14px;overflow:hidden">
        <div class="sec-head" style="padding:16px 16px 0;margin-bottom:0">
          <span class="step">2</span><h3>Opportunities we found</h3>
          <span class="note">${state.snapshotLoading
            ? `<span class="spin" style="width:11px;height:11px;vertical-align:-2px"></span> ${state.opportunitiesCompleted}/${state.opportunitiesTotal}`
            : `${autoOpps.length} ready &middot; sorted by eligible customers`}</span>
        </div>
        <div class="opptable-head" style="margin-top:14px">
          <span>Opportunity</span><span style="text-align:right">Eligible customers</span><span style="text-align:right">Status</span>
        </div>
        ${autoOpps.length ? `<div class="opptable-group">Ready now</div>${autoOpps.map((o) => oppRow(o, true)).join('')}` : ''}
        ${manualOpps.length ? `<div class="opptable-group">Needs a file</div>${manualOpps.map((o) => oppRow(o, false)).join('')}` : ''}
      </div>`;
  }

  function viewSynced() {
    const s = state.finalStatus || {};
    if (s.state === 'failed') {
      return `<div class="an-wrap">
        <div class="an-orb" style="background:var(--error-soft);color:var(--error)">${ic('warning','ic ic-xl')}</div>
        <h2>Sync failed</h2>
        <div class="sub">${s.error || 'The run was aborted before it finished.'}</div>
        <div style="margin-top:20px"><button class="btn" id="startOver">${ic('refresh','ic ic-sm')} Start over</button></div>
      </div>`;
    }

    const r = s.result || {};
    const failures = s.failures || [];
    const totalRows = r.rows || 0;
    const accepted = (r.newLeads || 0) + (r.updated || 0);
    const failedCount = failures.reduce((a, f) => a + f.rows, 0);

    return `
      <div class="page-head">
        <div><div class="page-eyebrow">Sales</div><div class="page-title">Data Mining</div>
          <div class="page-desc">Your leads are synced. Here is what came in.</div></div>
        <div class="spacer"></div>
        <button class="reset-link" id="startOver">${ic('refresh','ic ic-sm')} Upload another file</button>
      </div>

      <div class="card pad synced-card">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <span style="color:var(--success)">${ic('check_circle','ic ic-lg')}</span>
          <div>
            <h3>Synced — ${accepted.toLocaleString()} of ${totalRows.toLocaleString()} rows accepted</h3>
            <p style="color:var(--text-2);margin-top:2px">Next upload for this rooftop is just the file.</p>
          </div>
        </div>
        <div class="kpi-strip" style="margin-top:16px;grid-template-columns:repeat(4,1fr)">
          <div class="kpi"><div class="v num">${(r.newLeads || 0).toLocaleString()}</div><div class="k">New leads</div></div>
          <div class="kpi"><div class="v num">${(r.updated || 0).toLocaleString()}</div><div class="k">Updated in place</div></div>
          <div class="kpi"><div class="v num" style="color:var(--success)">${(r.cancelled || 0).toLocaleString()}</div><div class="k">Touches cancelled</div></div>
          <div class="kpi"><div class="v num">${(r.eligible || 0).toLocaleString()}</div><div class="k">Eligible now</div></div>
        </div>
      </div>

      ${failedCount ? `
      <div class="card pad" style="margin-top:14px;border-color:var(--warning-bd);background:var(--warning-soft)">
        <div style="display:flex;gap:10px"><span style="color:var(--warning-ink)">${ic('warning','ic')}</span><b>${failedCount} rows failed validation — accepted rows are unaffected</b></div>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">
          ${failures.map((f) => `<div style="display:flex;justify-content:space-between;font-size:13px"><span>${FAILURE_LABEL[f.reason] || f.reason}</span><b class="num">${f.rows}</b></div>`).join('')}
        </div>
      </div>` : ''}

      ${renderBusinessSnapshot()}

      <div class="finalcta" style="margin-top:20px">
        <span style="display:flex;width:44px;height:44px;border-radius:11px;background:rgba(255,255,255,.15);align-items:center;justify-content:center">${ic('rocket','ic ic-lg')}</span>
        <div><h3>Ready to turn this on?</h3><p>Launch your first campaign and Vini starts booking these appointments tonight.</p></div>
        <div class="spacer"></div>
        <button class="btn">${ic('rocket','ic ic-sm')} Launch first campaign</button>
      </div>`;
  }
  function mountSynced() {
    const btn = $('#startOver');
    if (btn) btn.onclick = () => { resetToUpload(); render(); };
  }

  /* ============================ ERROR ============================ */
  function viewError() {
    return `<div class="an-wrap">
      <div class="an-orb" style="background:var(--error-soft);color:var(--error)">${ic('info','ic ic-xl')}</div>
      <h2>We hit a snag</h2>
      <div class="sub">${state.error || 'Something went wrong.'}</div>
      <div style="margin-top:20px"><button class="btn" id="retry">${ic('refresh','ic ic-sm')} Try again</button></div>
    </div>`;
  }
  function mountError() { $('#retry').onclick = () => { resetToUpload(); render(); }; }

  /* ================================================================
   * Legacy scan-flow views — kept intact, not reachable from render().
   * See file header. Nothing below this line is wired to the new flow.
   * ================================================================ */
  function viewLegacyUpload() {
    const cfg = window.DM_MOCK.uploadConfig;
    const zone = (z) => `
      <div class="drop ${state.files && state.files[z.id] ? 'done' : ''}" data-zone="${z.id}">
        <div class="dh"><span class="di">${ic(state.files && state.files[z.id] ? 'check_circle' : z.icon, 'ic ic-lg')}</span>
          <div><h4>${z.title}</h4><div class="req">${z.req}</div></div></div>
        ${state.files && state.files[z.id]
          ? `<div class="doneline">${ic('check_circle','ic ic-18')} ${state.fileNames[z.id] || z.doneLabel}</div>`
          : `<div class="fields"><div class="fl">Columns we read</div>
               <div class="field-tags">${z.columns.map(f => `<span class="ftag">${f}</span>`).join('')}</div></div>
             <div class="act"><button class="btn sec sm" data-upload="${z.id}">${ic('cloud_upload','ic ic-sm')} Choose file</button></div>`}
        <input type="file" accept=".csv,text/csv" data-file="${z.id}" hidden>
      </div>`;
    return `
      <div class="page-head"><div><div class="page-eyebrow">Sales</div><div class="page-title">Data Mining</div>
        <div class="page-desc">Upload your past lead data. Our AI reads your history, finds the customers already sitting in your CRM, and shows how many extra appointments you could book each month, on autopilot.</div></div></div>
      <div class="card up-hero"><div class="up-hero-inner">
        <div class="eyebrow">${cfg.eyebrow}</div>
        <h2>${cfg.title}</h2>
        <p>${cfg.blurb}</p>
        <div class="up-steps">${cfg.steps.map((s,i)=>`<span class="up-step"><span class="n">${i+1}</span> ${s}</span>`).join('')}</div>
      </div></div>
      <div class="drop-grid">${cfg.zones.map(zone).join('')}</div>
      <div class="up-foot">
        <button class="btn lg" id="analyzeBtn">${ic('scan','ic')} Analyze my data</button>
        <span class="trust">${ic('shield','ic ic-18')} ${cfg.trust}</span>
        <span style="flex:1"></span>
        <button class="reset-link" id="prefill">${ic('sparkle','ic ic-sm')} ${cfg.sampleLabel}</button>
      </div>`;
  }

  /* ============================ ANALYZING (legacy) ============================ */
  function viewAnalyzing() {
    return `<div class="an-wrap">
      <div class="an-orb">${ic('scan','ic ic-xl')}</div>
      <h2>Analyzing your data</h2>
      <div class="sub">Checking your file, reading 3 years of history, and matching every outbound play. This takes a few seconds.</div>
      <div class="an-prog"><div class="fill" id="anfill"></div></div>
      <div class="an-rows" id="anrows"></div>
    </div>`;
  }
  const anRows = (steps) => steps.map(r =>
    `<div class="an-row"><span class="tk"></span><div class="an-tx"><span class="an-l">${r[0]}</span>${r[3]?`<span class="an-d">${r[3]}</span>`:''}</div><span class="v ${r[2]||''}">${r[1]==='done'?'':r[1]}</span></div>`
  ).join('');

  async function mountAnalyzing() {
    try {
      const scan  = state.sample ? { scanId: 'sample' } : await window.DM_API.createScan(state.fileObjs);
      state.scanId = scan.scanId;
      const steps = state.sample ? window.DM_MOCK.steps : await window.DM_API.getScanSteps(state.scanId);
      $('#anrows').innerHTML = anRows(steps);
      animateSteps(async () => {
        state.results = state.sample ? window.DM_MOCK.results : await window.DM_API.getResults(state.scanId);
        state.name = 'results'; render();
      });
    } catch (err) { state.error = err.message || String(err); state.name = 'error'; render(); }
  }
  function animateSteps(done) {
    const rows = $$('#anrows .an-row'); if (!rows.length) return done();
    const cfg = window.DM_CONFIG.analyze; let k = 0;
    const HOLD = [0, 820, 820, 700, 640, 700, 760, 640, 640, 700]; // per-step dwell; validation steps linger
    rows[0].classList.add('active'); rows[0].querySelector('.tk').outerHTML = '<span class="spin"></span>';
    const step = () => {
      if (k < rows.length) {
        const rr = rows[k]; rr.classList.add('done');
        const s = rr.querySelector('.spin');
        if (s) s.outerHTML = '<span class="tk">' + ic('check','ic ic-sm') + '</span>';
        else rr.querySelector('.tk').innerHTML = ic('check','ic ic-sm');
        $('#anfill').style.width = Math.round((k+1)/rows.length*100) + '%';
        k++;
        if (k < rows.length) { const nx = rows[k]; nx.classList.add('active'); const tk = nx.querySelector('.tk'); if (tk) tk.outerHTML = '<span class="spin"></span>'; }
        setTimeout(step, k >= rows.length ? cfg.stepDone : (HOLD[k] || cfg.stepMin));
      } else { done(); }
    };
    setTimeout(step, cfg.startDelay);
  }

  /* ============================ RESULTS (legacy) ============================ */
  const oppRows = (list) => list.map(o => `
    <tr><td><div class="oname"><span class="oi">${ic(o.ic,'ic ic-18')}</span><div><div class="onm">${o.n}</div><div class="odesc">${o.d}</div></div></div></td>
    <td class="r"><span class="lead-v num">${o.el}</span></td>
    <td class="r"><span class="appt-v num">${typeof o.ap==='number' ? '+'+o.ap.toFixed(1) : o.ap}</span></td>
    <td class="r"><span class="chip g"><span class="dot"></span>Ready</span></td></tr>`).join('');

  function viewResults(r) {
    const src = r.sources, srcTotal = src.reduce((a,s)=>a+s.v,0);
    const opp = r.opportunities;
    return `
      <div class="page-head">
        <div><div class="page-eyebrow">Sales</div><div class="page-title">Data Mining</div><div class="page-desc">${r.dealer.context}</div></div>
        <div class="spacer"></div>
        <button class="reset-link" id="rescan">${ic('refresh','ic ic-sm')} Re-run scan</button>
      </div>

      <!-- "Your business health report" hero hidden per request. To restore, re-render r.headline (still in the payload). -->

      <div class="res-section" data-reveal>
        <div class="sec-head"><span class="step">1</span><h3>Your business at a glance</h3><span class="note">Measured from your files</span></div>
        <div class="kpi-strip">${r.profile.map(p=>`<div class="kpi"><div class="v num">${p.v}</div><div class="k">${p.k}</div>${p.d?`<div class="d">${p.d}</div>`:''}</div>`).join('')}</div>
        <div class="card pad" style="margin-top:12px">
          <div style="font-size:13px;font-weight:600;margin-bottom:2px">Where your leads come from</div>
          <div class="src-bar">${src.map(s=>`<span style="width:${(s.v/srcTotal*100).toFixed(1)}%;background:${s.c}"></span>`).join('')}</div>
          <div class="src-legend">${src.map(s=>`<span><i style="background:${s.c}"></i>${s.n} · <b class="num">${s.v.toLocaleString()}</b> (${Math.round(s.v/srcTotal*100)}%)</span>`).join('')}</div>
        </div>
      </div>

      <div class="res-section" data-reveal>
        <div class="sec-head"><span class="step">2</span><h3>The simple math</h3><span class="note">How the money is made</span></div>
        <div class="card mathcard">
          <div class="funnel">${r.math.funnel.map((f,i,arr)=>`<div class="fstep"><div class="fv ${f.cls||''} num">${f.v}</div><div class="fk">${f.k}</div><div class="fsub">${f.sub}</div>${i<arr.length-1?`<span class="arw">${ic('arrow_right','ic ic-sm')}</span>`:''}</div>`).join('')}</div>
          <div class="eqn">${r.math.equation}</div>
        </div>
      </div>

      <div class="res-section" data-reveal>
        <div class="sec-head"><span class="step">3</span><h3>Your 12-month plan</h3><span class="note">${r.ramp.note}</span></div>
        <div class="ramp-wrap">
          <div class="card chart">
            <div class="chart-head"><h4>${r.ramp.title}</h4>
              <div class="chart-legend">${r.ramp.legend.map(l=>`<span><i style="background:${l.warn?'var(--warning-ink)':l.color};${l.warn?'opacity:.6':''}"></i>${l.label}</span>`).join('')}</div></div>
            <div class="bars" id="bars"></div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--text-3)">${r.ramp.captions.map(c=>`<span>${c}</span>`).join('')}</div>
          </div>
          <div class="card roi-card">
            <h4>${r.payoff.title}</h4>
            ${r.payoff.rows.map(row=>`<div class="roi-row"><span>${row.k}</span><span class="rv ${row.money?'money':''} num">${row.v}</span></div>`).join('')}
            <div class="roi-foot">${r.payoff.foot}</div>
          </div>
        </div>
      </div>

      <div class="res-section" data-reveal>
        <div class="sec-head"><span class="step">4</span><h3>Opportunities we found</h3><span class="note">${opp.note}</span></div>
        <div class="card" style="overflow:hidden">
          <table class="otable">
            <thead><tr><th>Opportunity</th><th class="r">Eligible customers</th><th class="r">Extra appts / mo</th><th class="r">Status</th></tr></thead>
            <tbody>
              ${opp.groups.map(g => `<tr class="grp"><td colspan="4">${g.label}</td></tr>` + oppRows(g.items)).join('')}
              ${opp.locked ? `<tr><td><div class="oname"><span class="oi lock">${ic('lock','ic ic-18')}</span><div><div class="onm">${opp.locked.n}</div><div class="odesc">${opp.locked.d}</div></div></div></td><td class="r"><span class="lead-v" style="color:var(--text-3)">${opp.locked.el}</span></td><td class="r"><span style="color:var(--text-3)">${opp.locked.ap}</span></td><td class="r"><span class="chip n">Locked</span></td></tr>` : ''}
            </tbody>
            <tfoot><tr><td>${opp.footer.label}</td><td class="r num">${opp.footer.eligible} <span style="color:var(--text-3);font-weight:500">${opp.footer.eligibleNote}</span></td><td class="r"><span class="num" style="color:var(--spyne-primary)">${opp.footer.appts}</span></td><td class="r"><span style="font-weight:500;color:var(--text-3);font-size:12px">${opp.footer.apptsNote}</span></td></tr></tfoot>
          </table>
        </div>
      </div>

      <p style="font-size:12.5px;color:var(--text-3);margin:10px 2px 0;line-height:1.55;max-width:92ch">${r.reconciliation}</p>

      <div class="finalcta" data-reveal>
        <span style="display:flex;width:44px;height:44px;border-radius:11px;background:rgba(255,255,255,.15);align-items:center;justify-content:center">${ic('rocket','ic ic-lg')}</span>
        <div><h3>${r.cta.title}</h3><p>${r.cta.desc}</p></div>
        <div class="spacer"></div>
        <button class="btn o">${ic('download','ic ic-sm')} ${r.cta.secondary}</button>
        <button class="btn">${ic('rocket','ic ic-sm')} ${r.cta.primary}</button>
      </div>`;
  }
  function mountResults(r) {
    const ramp = r.ramp, max = Math.max(...ramp.values), commitH = ramp.baseline / max * 100;
    $('#bars').innerHTML = `<div class="baseline" style="bottom:${commitH}%"><span class="bl-lab">${ramp.baselineLabel}</span></div>` +
      ramp.values.map((v,i)=>`<div class="bar-col"><div class="bar" style="height:0" data-h="${(v/max*100).toFixed(1)}"><span class="bv num">${v.toFixed(0)}</span></div><span class="bar-x">M${i+1}</span></div>`).join('');
    requestAnimationFrame(() => { setTimeout(() => { $$('#bars .bar').forEach((b,i) => { setTimeout(() => b.style.height = b.dataset.h + '%', i*45); }); }, 80); });
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold:.06, rootMargin:'0px 0px -5% 0px' });
    $$('[data-reveal]').forEach(el => io.observe(el));
    $('#rescan').onclick = () => {
      Object.assign(state, { name:'upload', results:null, scanId:null, sample:false, files:{lead:false,activity:false}, fileObjs:{}, fileNames:{} });
      render();
    };
  }

  /* ============================ RENDER ============================ */
  function render() {
    if (state.name === 'upload')        { mount.innerHTML = viewUpload();  mountUpload(); }
    else if (state.name === 'mapping')  { mount.innerHTML = viewMapping(); mountMapping(); }
    else if (state.name === 'syncing')  { mount.innerHTML = viewSyncing();mountSyncing(); }
    else if (state.name === 'synced')   { mount.innerHTML = viewSynced(); mountSynced(); }
    else                                { mount.innerHTML = viewError();  mountError(); }
    window.scrollTo(0, 0);
  }
  render();
})();
