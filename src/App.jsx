/* ============================================================================
 * Data Mining — App (React port of the old vanilla state machine).
 *
 * Flow: upload (attach) -> mapping -> syncing -> synced   (error fallback)
 *
 * `state` is a plain mutable object held in a ref, not React state - the
 * same shape and mutation pattern the vanilla app.js used
 * (`state.foo = x; render();`), just with `rerender()` standing in for the
 * old manual `render()` call. This is deliberate: it ports the existing,
 * already-tested control flow (goToMapping/confirmAndSync/pollSyncStatus/
 * loadBusinessSnapshot/pollOpportunities) close to verbatim, without the
 * stale-closure pitfalls of capturing values out of React state snapshots
 * mid-poll-loop.
 * ==========================================================================*/
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './lib/api.js';
import { cleanWarningMessage } from './lib/clean-warning-message.js';
import { ENTERPRISE_ID, TEAM_ID } from './lib/config.js';
import { matchCrmOptionLabel, slugifyCrmLabel } from './lib/crm-options.js';
import { UploadScreen } from './components/UploadScreen.jsx';
import { MappingScreen } from './components/MappingScreen.jsx';
import { SyncingScreen } from './components/SyncingScreen.jsx';
import { SyncedScreen } from './components/SyncedScreen.jsx';
import { ErrorScreen } from './components/ErrorScreen.jsx';

const SYNC_TERMINAL = new Set(['completed', 'completed_with_failures', 'failed']);

function makeInitialState() {
  return {
    name: 'upload', // upload | mapping | syncing | synced | error
    error: null,

    // upload (attach)
    fileObj: null,
    fileName: null,
    fileType: null, // one of FILE_TYPE_OPTIONS' values - required before Continue
    attachError: null,
    teamStatus: null, // GET /lead-uploads/team-status - crm + lastUploadAt for this team
    crm: null, // selected CRM_OPTIONS label - defaults from teamStatus once it loads, operator can override

    // mapping
    mappingLoading: false,
    mappingKey: null,
    fileKey: null, // fileKey the analyze response assigned to our one file
    masterFields: [], // GET /master-fields .fields
    analyzedColumns: [], // analyze response .files[0].columns - read-only, no overrides (CSV_ANALYZE_CHANGES.md)
    warnings: [],
    confirmLoading: false,
    confirmError: null,

    // syncing
    flowId: null,
    syncStatus: null, // latest poll response

    // synced
    finalStatus: null, // terminal poll response
    snapshotLoading: false, // true while report + sync-trigger + opportunities poll are in flight
    snapshotError: null,
    report: null, // GET .../data-mining/report
    opportunities: [], // GET .../data-mining/opportunities .opportunities
    opportunitiesTotal: 0,
    opportunitiesCompleted: 0,
  };
}

function fmtSize(b) {
  return b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' KB';
}

export default function App() {
  const stateRef = useRef(makeInitialState());
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);
  const state = stateRef.current;

  useEffect(() => {
    window.scrollTo(0, 0);
  });

  const resetToUpload = useCallback(() => {
    stateRef.current = makeInitialState();
    rerender();
  }, [rerender]);

  // Binding is read-only now (CSV_ANALYZE_CHANGES.md) - no overrides layer,
  // just whatever the stored mapping actually bound.
  const fieldColumn = useCallback((fieldKey) => {
    const s = stateRef.current;
    return s.analyzedColumns.find((col) => col.mappedField === fieldKey) || null;
  }, []);

  const goToMapping = useCallback(async () => {
    const s = stateRef.current;
    s.name = 'mapping';
    s.mappingLoading = true;
    s.mappingKey = null; s.fileKey = null;
    s.analyzedColumns = [];
    s.warnings = []; s.confirmError = null;
    rerender();
    try {
      const s3Key = await api.uploadFileToS3(s.fileObj);
      // Use whatever the operator picked in the CRM selector (defaults to
      // the auto-detected team-status CRM, but they can override it) -
      // the stored mapping is keyed on this real slug.
      const isOther = !s.crm || s.crm === 'Other / not listed';
      const providerName = isOther ? 'other' : slugifyCrmLabel(s.crm);
      const providerLabel = isOther ? (s.crm || 'CRM export') : undefined;
      const [mf, az] = await Promise.all([
        api.getMasterFields(),
        api.analyzeMapping({
          enterpriseId: ENTERPRISE_ID,
          teamId: TEAM_ID,
          providerName,
          providerLabel,
          files: [{ s3Key, type: s.fileType }],
        }),
      ]);
      s.masterFields = mf.fields || [];
      const file = (az.files || [])[0] || { fileKey: '', columns: [] };
      s.fileKey = file.fileKey;
      s.analyzedColumns = file.columns || [];
      s.warnings = az.warnings || [];
      s.mappingKey = az.mappingKey;
      s.mappingLoading = false;
      rerender();
    } catch (err) {
      s.error = cleanWarningMessage(err.message || String(err));
      s.name = 'error';
      rerender();
    }
  }, [rerender]);

  const handleFileChange = useCallback((file) => {
    const s = stateRef.current;
    if (!file) return;
    if (!/\.(xlsx|csv)$/i.test(file.name)) { s.attachError = 'Only .xlsx or .csv files are supported.'; rerender(); return; }
    s.fileObj = file;
    s.fileName = `${file.name} · ${fmtSize(file.size)}`;
    s.attachError = null;
    rerender();
  }, [rerender]);

  const handleFileTypeChange = useCallback((fileType) => {
    stateRef.current.fileType = fileType;
    rerender();
  }, [rerender]);

  const handleCrmChange = useCallback((crm) => {
    stateRef.current.crm = crm;
    rerender();
  }, [rerender]);

  const pollOpportunities = useCallback(async () => {
    const s = stateRef.current;
    try {
      const data = await api.getDataMiningOpportunities();
      s.opportunities = data.opportunities || [];
      s.opportunitiesTotal = data.total || 0;
      s.opportunitiesCompleted = data.completed || 0;
      if (data.poll) {
        rerender();
        setTimeout(pollOpportunities, 2000);
        return;
      }
      s.snapshotLoading = false;
      rerender();
    } catch (err) {
      s.snapshotLoading = false;
      s.snapshotError = err.message || String(err);
      rerender();
    }
  }, [rerender]);

  const loadBusinessSnapshot = useCallback(async () => {
    const s = stateRef.current;
    s.snapshotLoading = true;
    s.snapshotError = null;
    rerender();
    try {
      const [report] = await Promise.all([
        api.getDataMiningReport(),
        api.triggerDataMiningSync(),
      ]);
      s.report = report;
      rerender();
      await pollOpportunities();
    } catch (err) {
      s.snapshotLoading = false;
      s.snapshotError = err.message || String(err);
      rerender();
    }
  }, [pollOpportunities, rerender]);

  useEffect(() => {
    if (!ENTERPRISE_ID || !TEAM_ID) return;
    api.getTeamStatus({ enterpriseId: ENTERPRISE_ID, teamId: TEAM_ID })
      .then(async (teamStatus) => {
        const s = stateRef.current;
        s.teamStatus = teamStatus;
        // Default the picker to the auto-detected CRM, same as the campaign
        // upload flow - the operator can still change it below.
        s.crm = matchCrmOptionLabel(teamStatus?.crm) ?? 'Other / not listed';

        // Already synced once for this rooftop - land straight on the
        // results page instead of making the dealer re-upload just to see
        // it again. Only short-circuits on a genuinely terminal run;
        // anything still in flight falls through to the normal upload
        // screen (there's no flowId poll loop to resume here).
        const lastUpload = teamStatus?.lastUpload;
        if (lastUpload?.flowId && SYNC_TERMINAL.has(lastUpload.state)) {
          try {
            const status = await api.getSyncStatus(lastUpload.flowId);
            s.flowId = lastUpload.flowId;
            s.finalStatus = status;
            s.name = 'synced';
            rerender();
            if (status.state !== 'failed') loadBusinessSnapshot();
            return;
          } catch {
            // Fall through to the normal upload screen if the status fetch
            // fails - better to let them re-upload than get stuck.
          }
        }

        rerender();
      })
      .catch(() => {});
  }, [loadBusinessSnapshot, rerender]);

  const pollSyncStatus = useCallback(async () => {
    const s = stateRef.current;
    try {
      const status = await api.getSyncStatus(s.flowId);
      s.syncStatus = status;
      if (SYNC_TERMINAL.has(status.state)) {
        s.finalStatus = status;
        s.name = 'synced';
        rerender();
        // Only worth a snapshot if something actually landed - a hard failure
        // has nothing to report on.
        if (status.state !== 'failed') loadBusinessSnapshot();
        return;
      }
      rerender();
      setTimeout(pollSyncStatus, 2000);
    } catch (err) {
      s.error = err.message || String(err);
      s.name = 'error';
      rerender();
    }
  }, [loadBusinessSnapshot, rerender]);

  const confirmAndSync = useCallback(async () => {
    const s = stateRef.current;
    if (!s.mappingKey) return;
    s.confirmLoading = true; s.confirmError = null; rerender();
    // `overrides` is gone (CSV_ANALYZE_CHANGES.md) - the server ignores it
    // now, a wrong binding is fixed centrally instead of per upload.
    const result = await api.confirmMapping({ mappingKey: s.mappingKey });
    s.confirmLoading = false;
    if (result.ok) {
      s.flowId = result.data.flowId;
      s.name = 'syncing';
      s.syncStatus = null;
      rerender();
      pollSyncStatus();
    } else {
      // The 422 body's operator-facing reasons ride under `context.blocking`
      // (the global exception filter drops anything else at the top level) -
      // reading `.error.message` alone shows only a generic "cannot be
      // committed" line and silently drops why.
      const blockingMessages = ((result.error && result.error.context && result.error.context.blocking) || [])
        .map((b) => cleanWarningMessage(b.message));
      s.confirmError = blockingMessages.length
        ? blockingMessages.join(' ')
        : (result.error && result.error.message && cleanWarningMessage(result.error.message)) ||
          (result.status === 404 ? 'This mapping expired — re-run auto-detect and try again.' : 'Could not confirm the upload.');
      rerender();
    }
  }, [pollSyncStatus, rerender]);

  const handleBackToUpload = useCallback(() => {
    stateRef.current.name = 'upload';
    rerender();
  }, [rerender]);

  let screen;
  if (state.name === 'upload') {
    screen = (
      <UploadScreen
        state={state}
        onFileChange={handleFileChange}
        onFileTypeChange={handleFileTypeChange}
        onCrmChange={handleCrmChange}
        onContinue={goToMapping}
      />
    );
  } else if (state.name === 'mapping') {
    screen = (
      <MappingScreen
        state={state}
        fieldColumn={fieldColumn}
        onBack={handleBackToUpload}
        onRerun={goToMapping}
        onConfirm={confirmAndSync}
      />
    );
  } else if (state.name === 'syncing') {
    screen = <SyncingScreen state={state} />;
  } else if (state.name === 'synced') {
    screen = <SyncedScreen state={state} onStartOver={resetToUpload} />;
  } else {
    screen = <ErrorScreen state={state} onRetry={resetToUpload} />;
  }

  return <main className="content" aria-live="polite">{screen}</main>;
}
