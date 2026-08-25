import { Icon } from '../lib/icons.jsx';
import { BusinessSnapshot } from './BusinessSnapshot.jsx';

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

export function SyncedScreen({ state, onStartOver }) {
  const s = state.finalStatus || {};
  if (s.state === 'failed') {
    return (
      <div className="an-wrap">
        <div className="an-orb" style={{ background: 'var(--error-soft)', color: 'var(--error)' }}>
          <Icon name="warning" className="ic ic-xl" />
        </div>
        <h2>Sync failed</h2>
        <div className="sub">{s.error || 'The run was aborted before it finished.'}</div>
        <div style={{ marginTop: 20 }}>
          <button type="button" className="btn" onClick={onStartOver}>
            <Icon name="refresh" className="ic ic-sm" /> Start over
          </button>
        </div>
      </div>
    );
  }

  const r = s.result || {};
  const failures = s.failures || [];
  const totalRows = r.rows || 0;
  const accepted = (r.newLeads || 0) + (r.updated || 0);
  const failedCount = failures.reduce((a, f) => a + f.rows, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Sales</div>
          <div className="page-title">Data Mining</div>
          <div className="page-desc">Your leads are synced. Here is what came in.</div>
        </div>
        <div className="spacer" />
        <button type="button" className="reset-link" onClick={onStartOver}>
          <Icon name="refresh" className="ic ic-sm" /> Upload another file
        </button>
      </div>

      <div className="card pad synced-card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--success)' }}><Icon name="check_circle" className="ic ic-lg" /></span>
          <div>
            <h3>Synced — {accepted.toLocaleString()} of {totalRows.toLocaleString()} rows accepted</h3>
            <p style={{ color: 'var(--text-2)', marginTop: 2 }}>Next upload for this rooftop is just the file.</p>
          </div>
        </div>
        <div className="kpi-strip" style={{ marginTop: 16, gridTemplateColumns: 'repeat(4,1fr)' }}>
          <div className="kpi"><div className="v num">{(r.newLeads || 0).toLocaleString()}</div><div className="k">New leads</div></div>
          <div className="kpi"><div className="v num">{(r.updated || 0).toLocaleString()}</div><div className="k">Updated in place</div></div>
          <div className="kpi"><div className="v num" style={{ color: 'var(--success)' }}>{(r.cancelled || 0).toLocaleString()}</div><div className="k">Touches cancelled</div></div>
          <div className="kpi"><div className="v num">{(r.eligible || 0).toLocaleString()}</div><div className="k">Eligible now</div></div>
        </div>
      </div>

      {failedCount > 0 && (
        <div className="card pad" style={{ marginTop: 14, borderColor: 'var(--warning-bd)', background: 'var(--warning-soft)' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: 'var(--warning-ink)' }}><Icon name="warning" className="ic" /></span>
            <b>{failedCount} rows failed validation — accepted rows are unaffected</b>
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {failures.map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>{FAILURE_LABEL[f.reason] || f.reason}</span>
                <b className="num">{f.rows}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      <BusinessSnapshot state={state} />

      <div className="finalcta" style={{ marginTop: 20 }}>
        <span style={{ display: 'flex', width: 44, height: 44, borderRadius: 11, background: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="rocket" className="ic ic-lg" />
        </span>
        <div><h3>Ready to turn this on?</h3><p>Launch your first campaign and Vini starts booking these appointments tonight.</p></div>
        <div className="spacer" />
        <button type="button" className="btn"><Icon name="rocket" className="ic ic-sm" /> Launch first campaign</button>
      </div>
    </>
  );
}
