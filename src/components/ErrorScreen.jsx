import { Icon } from '../lib/icons.jsx';

export function ErrorScreen({ state, onRetry }) {
  return (
    <div className="an-wrap">
      <div className="an-orb" style={{ background: 'var(--error-soft)', color: 'var(--error)' }}>
        <Icon name="info" className="ic ic-xl" />
      </div>
      <h2>We hit a snag</h2>
      <div className="sub">{state.error || 'Something went wrong.'}</div>
      <div style={{ marginTop: 20 }}>
        <button type="button" className="btn" onClick={onRetry}>
          <Icon name="refresh" className="ic ic-sm" /> Try again
        </button>
      </div>
    </div>
  );
}
