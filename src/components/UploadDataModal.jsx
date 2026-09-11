import { useRef, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { api } from '../lib/api.js';
import { ENTERPRISE_ID, TEAM_ID } from '../lib/config.js';

const MAX_BYTES = 100 * 1024 * 1024;

function fmtSize(b) {
  return b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' KB';
}

/**
 * POST /integrations/data-ingestion/manual-upload - a separate, direct
 * multipart upload (no S3 presign step), distinct from the lead-uploads
 * flow the rest of this app uses. `department` decides which book this
 * DMS export lands in on the backend.
 */
export function UploadDataModal({ department, onClose }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | done
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const pickFile = (f) => {
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) { setError('Only .csv files are supported.'); return; }
    if (f.size > MAX_BYTES) { setError('File is larger than 100 MB.'); return; }
    setError(null);
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setStatus('uploading');
    setProgress(0);
    try {
      await api.manualUpload({
        file,
        enterpriseId: ENTERPRISE_ID,
        teamId: TEAM_ID,
        department,
        onProgress: setProgress,
      });
      setStatus('done');
    } catch (err) {
      setStatus('idle');
      setError(err.message || String(err));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Upload Data</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" className="ic" />
          </button>
        </div>
        <p className="modal-sub">Securely upload your DMS export as a CSV, up to 100 MB.</p>

        {status !== 'done' && (
          <>
            <div
              className="upload-drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); }}
            >
              {file ? (
                <div className="upload-file-chip">
                  <span className="upload-file-badge">CSV</span>
                  <div>
                    <div className="upload-file-name">{file.name}</div>
                    <div className="upload-file-size">{fmtSize(file.size)}</div>
                  </div>
                  {status === 'idle' && (
                    <button
                      type="button"
                      className="upload-file-remove"
                      onClick={() => { setFile(null); setError(null); }}
                      aria-label="Remove file"
                    >
                      <Icon name="close" className="ic ic-sm" />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <Icon name="cloud_upload" className="ic ic-xl" />
                  <div>
                    Drag and drop your file here or{' '}
                    <button type="button" className="upload-browse" onClick={() => inputRef.current?.click()}>
                      browse
                    </button>
                  </div>
                  <div className="upload-hint">CSV &middot; max 100 MB</div>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                hidden
                onChange={(e) => pickFile(e.target.files[0])}
              />
            </div>

            {file && status === 'idle' && !error && (
              <div className="helpbox ok" style={{ marginTop: 14, marginBottom: 0 }}>
                <Icon name="check_circle" className="ic" />
                <p>{file.name} ready to upload ({fmtSize(file.size)}).</p>
              </div>
            )}
            {error && (
              <div className="helpbox err" style={{ marginTop: 14, marginBottom: 0 }}>
                <Icon name="warning" className="ic" />
                <p>{error}</p>
              </div>
            )}
            {status === 'uploading' && (
              <div style={{ marginTop: 16 }}>
                <div className="an-prog" style={{ margin: 0 }}>
                  <div className="fill" style={{ width: `${progress}%` }} />
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 6 }}>{progress}%</div>
              </div>
            )}
          </>
        )}

        {status === 'done' && (
          <div className="helpbox ok" style={{ marginTop: 14, marginBottom: 0 }}>
            <Icon name="check_circle" className="ic" />
            <p>Upload complete. Your file is queued for ingestion.</p>
          </div>
        )}

        <div className="modal-foot">
          {status === 'done' ? (
            <>
              <button type="button" className="btn sec" onClick={onClose}>Close</button>
              <button type="button" className="btn" onClick={onClose}>Done</button>
            </>
          ) : (
            <>
              <button type="button" className="btn sec" onClick={onClose}>Cancel</button>
              <button type="button" className="btn" disabled={!file || status === 'uploading'} onClick={handleSubmit}>
                {status === 'uploading' ? `Uploading… ${progress}%` : 'Submit'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
