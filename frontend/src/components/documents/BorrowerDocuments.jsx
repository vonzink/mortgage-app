import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';

import mortgageService from '../../services/mortgageService';
import { Card } from '../design/Card';
import Button from '../design/Button';
import Pill from '../design/Pill';
import Icon from '../design/Icon';

/**
 * Borrower-facing documents panel, backed by the msfg-suite (the system of record). A borrower
 * uploads / lists / downloads THEIR OWN documents straight into the suite, so staff processing/UW
 * see them. Keyed by the suite loanId (a UUID). Uploads land unfiled for staff to categorize.
 */

const STATUS = {
  UPLOADED: { label: 'Uploaded', tone: 'muted' },
  READY_FOR_REVIEW: { label: 'In review', tone: 'review' },
  ACCEPTED: { label: 'Accepted', tone: 'active' },
  REJECTED: { label: 'Needs replacing', tone: 'danger' },
  NEEDS_BORROWER_ACTION: { label: 'Action needed', tone: 'warn' },
};

function fmtSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function BorrowerDocuments({ suiteLoanId, onChanged }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    if (!suiteLoanId) { setLoading(false); return; }
    try {
      const list = await mortgageService.getBorrowerDocuments(suiteLoanId);
      setDocs(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('load borrower documents', e);
    } finally {
      setLoading(false);
    }
  }, [suiteLoanId]);

  useEffect(() => { load(); }, [load]);

  const uploadFiles = useCallback(async (files) => {
    const arr = Array.from(files || []).filter(Boolean);
    if (!arr.length || !suiteLoanId) return;
    setUploading(true);
    let ok = 0;
    for (const file of arr) {
      try {
        await mortgageService.uploadBorrowerDocument(suiteLoanId, file);
        ok++;
      } catch (e) {
        console.error('upload failed', file?.name, e);
        toast.error(`Couldn't upload ${file?.name || 'file'}`);
      }
    }
    setUploading(false);
    if (ok) {
      toast.success(`Uploaded ${ok} document${ok > 1 ? 's' : ''}`);
      if (onChanged) onChanged();
    }
    load();
  }, [suiteLoanId, load, onChanged]);

  const onPick = (e) => { uploadFiles(e.target.files); e.target.value = ''; };
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); };

  const download = async (doc) => {
    try {
      const res = await mortgageService.getBorrowerDocumentDownloadUrl(suiteLoanId, doc.docUuid);
      if (res?.downloadUrl) window.location.href = res.downloadUrl;
    } catch (e) {
      toast.error('Could not open that document');
    }
  };

  return (
    <Card pad className="borrower-docs">
      <div className="card-header">
        <div className="card-title">
          <Icon name="doc" size={14} stroke={1.8} /><span>Your documents</span>
        </div>
        <Button variant="primary" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Icon name="upload" size={12} /> {uploading ? 'Uploading…' : 'Upload'}
        </Button>
      </div>

      <input ref={inputRef} type="file" multiple hidden onChange={onPick} />

      <div
        className={`borrower-docs__drop${dragOver ? ' is-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        style={{
          border: '1.5px dashed var(--border, #cbd5e1)', borderRadius: 10, padding: 18,
          textAlign: 'center', cursor: 'pointer', margin: '12px 0',
          background: dragOver ? 'rgba(16,185,129,0.06)' : 'transparent',
        }}
      >
        <Icon name="upload" size={18} stroke={1.6} />
        <div className="muted" style={{ marginTop: 6 }}>
          Drag files here or click to upload — paystubs, W-2s, bank statements, ID…
        </div>
      </div>

      {loading ? (
        <div className="muted">Loading…</div>
      ) : docs.length === 0 ? (
        <div className="muted" style={{ padding: '8px 0' }}>
          No documents yet. Upload the items your loan officer requested.
        </div>
      ) : (
        <div className="borrower-docs__list">
          {docs.map((d) => {
            const s = STATUS[d.status] || { label: d.status || '—', tone: 'muted' };
            return (
              <div
                key={d.docUuid}
                className="borrower-docs__row"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                  borderTop: '1px solid var(--border-subtle, #eef2f7)',
                }}
              >
                <Icon name="doc" size={16} stroke={1.6} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.fileName || 'Document'}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {fmtSize(d.fileSize)}{d.uploadedAt ? ` · ${new Date(d.uploadedAt).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <Pill tone={s.tone}>{s.label}</Pill>
                <Button variant="ghost" size="sm" onClick={() => download(d)} title="Download">
                  <Icon name="download" size={12} />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
