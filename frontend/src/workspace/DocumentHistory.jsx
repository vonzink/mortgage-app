import React, { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import auditService from '../services/auditService';
import { formatAction, formatDateTime as formatDate } from '../utils/format';

/**
 * Read-only timeline of every audit log entry for a single document.
 * Combines uploads, downloads, moves, renames, status changes, and reviews into
 * one chronological view.
 */
export default function DocumentHistory({ loanId, doc, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await auditService.getDocumentHistory(loanId, doc.docUuid);
        if (!cancelled) setEntries(data.history || []);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || e.message || 'Failed to load history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loanId, doc.docUuid]);

  return (
    <div className="ws-modal-backdrop" onClick={onClose}>
      <div className="ws-modal ws-modal--wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Document history">
        <div className="ws-modal-head">
          <div>
            <h3 style={{ margin: 0 }}>History</h3>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary, #666)', fontSize: '0.85rem' }}>
              {doc.fileName}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><FaTimes /></button>
        </div>
        <div className="ws-modal-body">
          {loading && <p>Loading…</p>}
          {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
          {!loading && !error && entries.length === 0 && (
            <p style={{ color: 'var(--text-secondary, #666)' }}>No history entries yet.</p>
          )}
          {!loading && entries.length > 0 && (
            <ol className="ws-history-list">
              {entries.map((e) => (
                <li key={e.id} className="ws-history-row">
                  <div className="ws-history-action">{formatAction(e.action)}</div>
                  <div className="ws-history-meta">
                    <span>{e.userRole || 'system'}</span>
                    {e.userId && <span> · user #{e.userId}</span>}
                    <span> · {formatDate(e.createdAt)}</span>
                  </div>
                  {e.metadataJson && <Metadata json={e.metadataJson} />}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function Metadata({ json }) {
  try {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    if (!obj || Object.keys(obj).length === 0) return null;
    return (
      <div className="ws-history-meta-extra">
        {Object.entries(obj).map(([k, v]) => (
          <span key={k} className="ws-history-pill" title={`${k}: ${v}`}>
            <strong>{k}:</strong> {String(v)}
          </span>
        ))}
      </div>
    );
  } catch {
    return null;
  }
}

// formatAction / formatDate now imported from utils/format (audit SI-1).
