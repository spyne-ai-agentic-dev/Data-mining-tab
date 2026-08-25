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
import { ENTERPRISE_ID, TEAM_ID } from './lib/config.js';
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
    attachError: null,

    // mapping
    mappingLoading: false,
    mappingKey: null,
    fileKey: null, // fileKey the analyze response assigned to our one file
    masterFields: [], // GET /master-fields .fields
    analyzedColumns: [], // analyze response .files[0].columns
    overrides: {}, // header -> mappedField|null, only user-changed bindings
    blocking: [],
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

  const fieldColumn = useCallback((fieldKey) => {
    const s = stateRef.current;
    for (const col of s.analyzedColumns) {
      const hasOverride = Object.prototype.hasOwnProperty.call(s.overrides, col.header);
      const effective = hasOverride ? s.overrides[col.header] : col.mappedField;
      if (effective === fieldKey) return col;
    }
    return null;
  }, []);

  const goToMapping = useCallback(async () => {
    const s = stateRef.current;
    s.name = 'mapping';
    s.mappingLoading = true;
    s.mappingKey = null; s.fileKey = null;
    s.analyzedColumns = []; s.overrides = {};
    s.blocking = []; s.warnings = []; s.confirmError = null;
    rerender();
    try {
      const s3Key = await api.uploadFileToS3(s.fileObj);
      const [mf, az] = await Promise.all([
        api.getMasterFields(),
        api.analyzeMapping({
          enterpriseId: ENTERPRISE_ID,
          teamId: TEAM_ID,
          providerName: 'other',
          providerLabel: 'CRM export',
          files: [{ s3Key }],
        }),
      ]);
      s.masterFields = mf.fields || [];
      const file = (az.files || [])[0] || { fileKey: '', columns: [] };
      s.fileKey = file.fileKey;
      s.analyzedColumns = file.columns || [];
      s.blocking = az.blocking || [];
      s.warnings = az.warnings || [];
      s.mappingKey = az.mappingKey;
      s.mappingLoading = false;
      rerender();
    } catch (err) {
      s.error = err.message || String(err);
      s.name = 'error';
      rerender();
    }
  }, [rerender]);

  const handleFileChange = useCallback((file) => {
    const s = stateRef.current;
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { s.attachError = 'Only .xlsx files are supported.'; rerender(); return; }
    s.fileObj = file;
    s.fileName = `${file.name} · ${fmtSize(file.size)}`;
    s.attachError = null;
    rerender();
  }, [rerender]);

  const handleOverrideChange = useCallback((fieldKey, newHeader) => {
    const s = stateRef.current;
    const prevCol = fieldColumn(fieldKey);
    if (prevCol && prevCol.header !== newHeader) s.overrides[prevCol.header] = null;
    if (newHeader) s.overrides[newHeader] = fieldKey; // supersedes any other field that held this column
    rerender();
  }, [fieldColumn, rerender]);

  const buildOverridesPayload = useCallback(() => {
    const s = stateRef.current;
    return Object.keys(s.overrides).map((header) => ({
      fileKey: s.fileKey, header, mappedField: s.overrides[header],
    }));
  }, []);

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
    if (!s.mappingKey || s.blocking.length) return;
    s.confirmLoading = true; s.confirmError = null; rerender();
    const result = await api.confirmMapping({
      mappingKey: s.mappingKey,
      overrides: buildOverridesPayload(),
    });
    s.confirmLoading = false;
    if (result.ok) {
      s.flowId = result.data.flowId;
      s.name = 'syncing';
      s.syncStatus = null;
      rerender();
      pollSyncStatus();
    } else {
      s.confirmError = (result.error && result.error.message) ||
        (result.status === 404 ? 'This mapping expired — re-run auto-detect and try again.' : 'Could not confirm the upload.');
      rerender();
    }
  }, [buildOverridesPayload, pollSyncStatus, rerender]);

  const handleBackToUpload = useCallback(() => {
    stateRef.current.name = 'upload';
    rerender();
  }, [rerender]);

  let screen;
  if (state.name === 'upload') {
    screen = <UploadScreen state={state} onFileChange={handleFileChange} onContinue={goToMapping} />;
  } else if (state.name === 'mapping') {
    screen = (
      <MappingScreen
        state={state}
        fieldColumn={fieldColumn}
        onOverrideChange={handleOverrideChange}
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
