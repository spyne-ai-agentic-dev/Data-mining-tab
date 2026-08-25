import { Icon } from '../lib/icons.jsx';

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

function OppRow({ o, isAuto }) {
  return (
    <div className="opptable-row">
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span className="opp-icon"><Icon name={opportunityIcon(o)} className="ic ic-sm" /></span>
        <div>
          <div className="opp-name">{o.name}</div>
          <div className="opp-desc">{o.description}</div>
        </div>
      </div>
      <div className={`opp-eligible ${isAuto ? '' : 'dash'}`}>
        {isAuto ? (o.count || 0).toLocaleString() : '—'}
      </div>
      <div className="opp-status">
        {isAuto ? (
          <span className="chip g">
            <span className="dot" />{o.syncStatus === 'SUCCESS' ? 'Ready' : o.syncStatus}
          </span>
        ) : (
          <span className="chip n">Needs upload</span>
        )}
      </div>
    </div>
  );
}

/** Post-sync "business at a glance" + real opportunities table. Separate
 * from the lead-uploads flow - reflects the team's whole lead book, not
 * just the file just synced. */
export function BusinessSnapshot({ state }) {
  if (state.snapshotError) {
    return (
      <div className="helpbox err" style={{ marginTop: 14 }}>
        <Icon name="warning" className="ic" />
        <p>{state.snapshotError}</p>
      </div>
    );
  }
  if (!state.report && state.snapshotLoading) {
    return (
      <div className="card pad" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-2)' }}>
        <span className="spin" /> Pulling your business snapshot together...
      </div>
    );
  }
  if (!state.report) return null;

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

  return (
    <>
      <div className="card pad" style={{ marginTop: 14 }}>
        <div className="sec-head" style={{ marginBottom: 0 }}>
          <span className="step">1</span><h3>Your business at a glance</h3>
          <span className="note">Measured from your files</span>
        </div>
        <div className="kpi-strip" style={{ marginTop: 16 }}>
          {kpis.map((k) => (
            <div className="kpi" key={k.k}>
              <div className="v num">{k.v}</div>
              <div className="k">{k.k}</div>
              {k.d && <div className="d">{k.d}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14, overflow: 'hidden' }}>
        <div className="sec-head" style={{ padding: '16px 16px 0', marginBottom: 0 }}>
          <span className="step">2</span><h3>Opportunities we found</h3>
          <span className="note">
            {state.snapshotLoading ? (
              <>
                <span className="spin" style={{ width: 11, height: 11, verticalAlign: -2 }} />{' '}
                {state.opportunitiesCompleted}/{state.opportunitiesTotal}
              </>
            ) : (
              `${autoOpps.length} ready · sorted by eligible customers`
            )}
          </span>
        </div>
        <div className="opptable-head" style={{ marginTop: 14 }}>
          <span>Opportunity</span>
          <span style={{ textAlign: 'right' }}>Eligible customers</span>
          <span style={{ textAlign: 'right' }}>Status</span>
        </div>
        {autoOpps.length > 0 && (
          <>
            <div className="opptable-group">Ready now</div>
            {autoOpps.map((o) => <OppRow key={o.opportunityId} o={o} isAuto />)}
          </>
        )}
        {manualOpps.length > 0 && (
          <>
            <div className="opptable-group">Needs a file</div>
            {manualOpps.map((o) => <OppRow key={o.opportunityId} o={o} isAuto={false} />)}
          </>
        )}
      </div>
    </>
  );
}
