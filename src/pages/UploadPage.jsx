import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, uploadCsv } from '../api.js';
import { formatBytes } from '../format.js';

const ACTIVE = ['queued', 'processing'];
const STATUS_LABEL = {
  queued: 'Queued',
  processing: 'Processing',
  completed: 'Completed',
  completed_with_errors: 'Completed with errors',
  failed: 'Failed',
};

export const StatusBadge = ({ status }) => <span className={`badge badge-${status}`}>{STATUS_LABEL[status] ?? status}</span>;

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [current, setCurrent] = useState(null);
  const inputRef = useRef();

  // Poll the active upload until processing finishes.
  useEffect(() => {
    if (!current || !ACTIVE.includes(current.status)) return;
    const t = setTimeout(async () => {
      try {
        setCurrent(await apiFetch(`/api/uploads/${current.id}`));
      } catch (e) {
        setError({ message: e.message });
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [current]);

  useEffect(() => {
    if (current?.status === 'completed' || current?.status === 'completed_with_errors') {
      navigate(`/prices?uploadId=${current.id}`);
    }
  }, [current, navigate]);

  const pickFile = (f) => {
    setError(null);
    if (f && !f.name.toLowerCase().endsWith('.csv')) {
      setError({ message: 'Please choose a .csv file.' });
      return;
    }
    setFile(f ?? null);
  };

  const submit = async (force = false) => {
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      const created = await uploadCsv(file, { force, onProgress: setProgress });
      setCurrent(created);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (e) {
      setError({ message: e.message, duplicate: e.status === 409 });
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <h1>Upload pricing feed</h1>
        <p className="muted">
          CSV with columns <code>Store ID, SKU, Product Name, Price, Date</code> (optional <code>Currency</code>). Dates use{' '}
          <code>YYYY-MM-DD</code>. Rows with the same Store ID, SKU and Date replace the existing price.{' '}
          <a href="/sample-prices.csv" download>
            Download sample
          </a>
        </p>

        <div
          className={`dropzone ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickFile(e.dataTransfer.files[0]);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => pickFile(e.target.files[0])} />
          {file ? (
            <>
              <strong>{file.name}</strong>
              <span className="muted">{formatBytes(file.size)}</span>
            </>
          ) : (
            <>
              <strong>Drop a CSV file here</strong>
              <span className="muted">or click to browse</span>
            </>
          )}
        </div>

        {progress != null && (
          <div className="progress" aria-label="Upload progress">
            <div style={{ width: `${progress}%` }} />
            <span>{progress < 100 ? `Uploading ${progress}%` : 'Upload received, queuing…'}</span>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            {error.message}
            {error.duplicate && file && (
              <button className="btn btn-small" onClick={() => submit(true)}>
                Process again anyway
              </button>
            )}
          </div>
        )}

        <div className="actions">
          <button className="btn btn-primary" disabled={!file || progress != null} 
          onClick={() => submit(false)}>
            Upload
          </button>
        </div>
      </section>

      {current && <UploadResult upload={current} />}
    </div>
  );
}

function UploadResult({ upload }) {
  const active = ACTIVE.includes(upload.status);
  return (
    <section className="card">
      <div className="section-header">
        <h2>
          {upload.fileName} <StatusBadge status={upload.status} />
        </h2>
      </div>
      {active && <p className="muted">Processing… {upload.totalRows.toLocaleString()} rows read so far.</p>}
      {upload.failureReason && <div className="alert alert-error">{upload.failureReason}</div>}
      <div className="stats">
        <Stat label="Rows read" value={upload.totalRows} />
        <Stat label="Inserted" value={upload.insertedCount} tone="good" />
        <Stat label="Updated" value={upload.updatedCount} tone="info" />
        <Stat label="Rejected" value={upload.errorCount} tone={upload.errorCount ? 'bad' : undefined} />
      </div>
      {upload.rowErrors?.length > 0 && (
        <>
          <h3>Rejected rows</h3>
          {upload.errorCount > upload.rowErrors.length && (
            <p className="muted small">
              Showing the first {upload.rowErrors.length} of {upload.errorCount} errors.
            </p>
          )}
          <div className="table-wrap errors-table">
            <table>
              <thead>
                <tr>
                  <th className="num">Line</th>
                  <th>Problem</th>
                </tr>
              </thead>
              <tbody>
                {upload.rowErrors.map((e, i) => (
                  <tr key={i}>
                    <td className="num">{e.row}</td>
                    <td>{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

const Stat = ({ label, value, tone }) => (
  <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
    <div className="stat-value">{(value ?? 0).toLocaleString()}</div>
    <div className="stat-label">{label}</div>
  </div>
);
