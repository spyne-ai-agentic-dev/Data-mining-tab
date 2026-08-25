import { Icon } from '../lib/icons.jsx';

export function UploadScreen({ state, onFileChange, onContinue }) {
  const hasFile = !!state.fileObj;
  const openPicker = () => document.getElementById('fileInput')?.click();

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Sales</div>
          <div className="page-title">Data Mining</div>
          <div className="page-desc">
            Upload your CRM lead export. We map its columns onto our fields, you confirm, then it
            syncs in — no CSV wrangling, no guesswork.
          </div>
        </div>
      </div>

      <div className="card up-hero">
        <div className="up-hero-inner">
          <div className="eyebrow">Free business health check &middot; normally $99</div>
          <h2>See the appointments already hiding in your data</h2>
          <p>
            We do not send anything to your customers. This is a read-only look at what your
            outbound AI agent could recover from leads you have already paid for.
          </p>
          <div className="up-steps">
            <span className="up-step"><span className="n">1</span> Attach your file</span>
            <span className="up-step"><span className="n">2</span> Map its columns</span>
            <span className="up-step"><span className="n">3</span> Confirm &amp; sync</span>
          </div>
        </div>
      </div>

      <div className="drop-grid one">
        <div
          className={`drop ${hasFile ? 'done' : ''}`}
          style={{ cursor: hasFile ? 'default' : 'pointer' }}
          onClick={() => { if (!hasFile) openPicker(); }}
        >
          <div className="dh">
            <span className="di"><Icon name={hasFile ? 'check_circle' : 'file'} className="ic ic-lg" /></span>
            <div>
              <h4>Lead export</h4>
              <div className="req">Required &middot; .xlsx only</div>
            </div>
          </div>
          {hasFile ? (
            <div className="doneline">
              <Icon name="check_circle" className="ic ic-18" /> {state.fileName}
            </div>
          ) : (
            <div className="act">
              <button
                type="button"
                className="btn sec sm"
                onClick={(e) => { e.stopPropagation(); openPicker(); }}
              >
                <Icon name="cloud_upload" className="ic ic-sm" /> Choose file
              </button>
            </div>
          )}
          <input
            type="file"
            accept=".xlsx"
            id="fileInput"
            hidden
            onChange={(e) => onFileChange(e.target.files[0])}
          />
        </div>
      </div>

      {state.attachError && (
        <div className="helpbox err" style={{ marginTop: 14 }}>
          <Icon name="warning" className="ic" />
          <p>{state.attachError}</p>
        </div>
      )}

      <div className="up-foot">
        <button type="button" className="btn lg" disabled={!hasFile} onClick={onContinue}>
          <Icon name="scan" className="ic" /> Continue to mapping
        </button>
        <span className="trust"><Icon name="shield" className="ic ic-18" /> Read-only &middot; encrypted</span>
      </div>
    </>
  );
}
