import { Icon } from '../lib/icons.jsx';

export function SyncingScreen({ state }) {
  const s = state.syncStatus || {};
  const processed = s.processed || 0;
  const total = s.total || 0;
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  return (
    <div className="an-wrap">
      <div className="an-orb"><Icon name="scan" className="ic ic-xl" /></div>
      <h2>Syncing your leads</h2>
      <div className="sub">
        The raw file and mapping are with the backend. We poll it for status; the count climbing
        is the poll.
      </div>
      <div className="an-prog"><div className="fill" style={{ width: `${pct}%` }} /></div>
      <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
        {processed.toLocaleString()} of {total.toLocaleString()} rows &middot; {pct}%
      </div>
    </div>
  );
}
