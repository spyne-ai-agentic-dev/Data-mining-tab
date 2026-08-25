import { Icon } from '../lib/icons.jsx';

const MATCH_LABEL = { EXACT: 'exact match', SUBSTRING: 'partial match', LLM: 'AI match', MANUAL: 'manual', NONE: '' };

function ConsentCard({ fieldKey, label, icon, onCopy, offCopy, fieldColumn }) {
  const on = !!fieldColumn(fieldKey);
  return (
    <div className={`consent-card ${on ? 'on' : ''}`}>
      <div className="cc-head">
        <Icon name={icon} className="ic ic-sm" /><b>{label}</b>
        {!on && <span className="cc-off">&middot; off</span>}
      </div>
      <p>{on ? onCopy : offCopy}</p>
    </div>
  );
}

export function MappingScreen({ state, fieldColumn, onOverrideChange, onBack, onRerun, onConfirm }) {
  if (state.mappingLoading) {
    return (
      <div className="an-wrap">
        <div className="an-orb"><Icon name="scan" className="ic ic-xl" /></div>
        <h2>Reading your file</h2>
        <div className="sub">Uploading and matching columns against our field catalogue.</div>
      </div>
    );
  }

  const matched = state.analyzedColumns.filter((c) => {
    const hasOverride = Object.prototype.hasOwnProperty.call(state.overrides, c.header);
    return hasOverride ? !!state.overrides[c.header] : !!c.mappedField;
  }).length;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Sales</div>
          <div className="page-title">Data Mining</div>
          <div className="page-desc">
            Map their columns to our fields. Their names are not ours — this is what makes the
            opportunity math portable.
          </div>
        </div>
      </div>

      <div className="card pad" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <b>{matched} of {state.analyzedColumns.length} matched automatically</b>
          <button type="button" className="reset-link" onClick={onRerun}>
            <Icon name="refresh" className="ic ic-sm" /> Re-run auto-detect
          </button>
        </div>
      </div>

      {state.blocking.length > 0 && (
        <div className="helpbox err" style={{ marginBottom: 14 }}>
          <Icon name="warning" className="ic" />
          <div>
            <b>Fix these before confirming:</b>
            {state.blocking.map((b, i) => <p key={i}>{b.message}</p>)}
          </div>
        </div>
      )}
      {state.warnings.length > 0 && (
        <div className="helpbox warn" style={{ marginBottom: 14 }}>
          <Icon name="warning" className="ic" />
          <div>
            {state.warnings.map((w, i) => <p key={i}>{w.message}</p>)}
          </div>
        </div>
      )}

      <div className="consent-grid">
        <ConsentCard
          fieldKey="consent_call" label="Calling" icon="phone" fieldColumn={fieldColumn}
          onCopy="Do-not-call respected on every dial"
          offCopy="No consent column — calls will not be gated"
        />
        <ConsentCard
          fieldKey="consent_sms" label="SMS" icon="forum" fieldColumn={fieldColumn}
          onCopy="Text steps run"
          offCopy="No consent column — SMS steps are skipped"
        />
        <ConsentCard
          fieldKey="consent_email" label="Email" icon="mail" fieldColumn={fieldColumn}
          onCopy="Email steps run"
          offCopy="Email steps skipped — calls still run"
        />
      </div>

      <div className="card" style={{ overflow: 'hidden', marginTop: 14 }}>
        <table className="maptable">
          <thead><tr><th>Our field</th><th>Their column</th><th>What it drives</th></tr></thead>
          <tbody>
            {state.masterFields.map((f) => {
              const col = fieldColumn(f.key);
              const isGate = f.critical;
              const isUnmapped = isGate && !col;
              return (
                <tr key={f.key} className={isUnmapped ? 'gate-empty' : ''}>
                  <td>
                    <b>{f.label}</b>{' '}
                    {isGate
                      ? <span className="chip w">GATE</span>
                      : (f.required ? <span className="chip n">REQ</span> : null)}
                  </td>
                  <td>
                    <select
                      className={`mapsel ${isUnmapped ? 'err' : ''}`}
                      value={col ? col.header : ''}
                      onChange={(e) => onOverrideChange(f.key, e.target.value)}
                    >
                      <option value="">Not mapped</option>
                      {state.analyzedColumns.map((c) => (
                        <option key={c.header} value={c.header}>{c.header}</option>
                      ))}
                    </select>
                    {col && <div className="mapmeta">{MATCH_LABEL[col.matchKind] || ''}</div>}
                  </td>
                  <td className="mapwhat">{f.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {state.confirmError && (
        <div className="helpbox err" style={{ marginTop: 14 }}>
          <Icon name="warning" className="ic" />
          <p>{state.confirmError}</p>
        </div>
      )}
      <div className="up-foot">
        <button type="button" className="reset-link" onClick={onBack}>&larr; Back</button>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="btn lg"
          disabled={!state.mappingKey || state.blocking.length > 0 || state.confirmLoading}
          onClick={onConfirm}
        >
          <Icon name="rocket" className="ic ic-sm" /> {state.confirmLoading ? 'Confirming…' : 'Confirm & sync'}
        </button>
      </div>
    </>
  );
}
