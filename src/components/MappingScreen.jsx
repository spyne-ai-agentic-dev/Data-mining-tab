import { cleanWarningMessage } from '../lib/clean-warning-message.js';
import { Icon } from '../lib/icons.jsx';

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

/**
 * Binding now comes from a stored mapping keyed on (crm, type), reviewed
 * once by a person and applied identically every run (CSV_ANALYZE_CHANGES.md)
 * - so this screen is read-only (header, bound field, first three raw
 * sample values), not an editable per-column review step the way it used
 * to be. A wrong binding gets fixed centrally, not per upload.
 */
export function MappingScreen({ state, fieldColumn, onBack, onRerun, onConfirm }) {
  if (state.mappingLoading) {
    return (
      <div className="an-wrap">
        <div className="an-orb"><Icon name="scan" className="ic ic-xl" /></div>
        <h2>Reading your file</h2>
        <div className="sub">Uploading and matching columns against our field catalogue.</div>
      </div>
    );
  }

  const masterFieldByKey = {};
  state.masterFields.forEach((f) => { masterFieldByKey[f.key] = f; });

  // Unmapped columns (kept server-side as extras) aren't shown here - this
  // table is only the bound-column view.
  const mappedColumns = state.analyzedColumns
    .filter((c) => c.mappedField && masterFieldByKey[c.mappedField])
    .map((c) => ({ col: c, field: masterFieldByKey[c.mappedField] }));

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Sales</div>
          <div className="page-title">Data Mining</div>
          <div className="page-desc">
            Their columns, bound to our fields. This comes from the saved mapping for this CRM and
            file type, reviewed once by a person - it&apos;s read-only here.
          </div>
        </div>
      </div>

      <div className="card pad" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <b>{mappedColumns.length} of {state.analyzedColumns.length} columns bound</b>
          <button type="button" className="reset-link" onClick={onRerun}>
            <Icon name="refresh" className="ic ic-sm" /> Re-run auto-detect
          </button>
        </div>
      </div>

      {state.warnings.length > 0 && (
        <div className="helpbox warn" style={{ marginBottom: 14 }}>
          <Icon name="warning" className="ic" />
          <div>
            {state.warnings.map((w, i) => <p key={i}>{cleanWarningMessage(w.message)}</p>)}
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
          <thead><tr><th>Their column</th><th>Our field</th><th>First 3 values</th></tr></thead>
          <tbody>
            {mappedColumns.map(({ col, field }) => (
              <tr key={col.header}>
                <td><b>{col.header}</b></td>
                <td>
                  {field.label}{' '}
                  {field.critical && <span className="chip w">GATE</span>}
                </td>
                <td className="mapwhat">{(col.sampleValues || []).join(', ') || '—'}</td>
              </tr>
            ))}
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
          disabled={!state.mappingKey || state.confirmLoading}
          onClick={onConfirm}
        >
          <Icon name="rocket" className="ic ic-sm" /> {state.confirmLoading ? 'Confirming…' : 'Confirm & sync'}
        </button>
      </div>
    </>
  );
}
