import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

import mortgageService from '../../services/mortgageService';
import { suiteLoanUrl } from '../../services/suiteWeb';
import { Card } from '../design/Card';
import Button from '../design/Button';
import Pill from '../design/Pill';
import Icon from '../design/Icon';

/**
 * Staff-facing documents panel, READ-ONLY. The suite (system of record) owns document management
 * now — upload/delete/review all happen in the suite console. This panel exists so staff can see
 * what's on file and pull a quick download without leaving the loan detail page in mortgage-app.
 * Keyed by the suite loanId (a UUID). Retires the old mortgage-app WorkspaceTab path, which broke
 * for suite-era loans (it expected a numeric mortgage-app loan id, not a suite UUID).
 */

const STATUS = {
  UPLOADED: { label: 'Uploaded', tone: 'muted' },
  READY_FOR_REVIEW: { label: 'In review', tone: 'review' },
  ACCEPTED: { label: 'Accepted', tone: 'active' },
  REJECTED: { label: 'Needs replacing', tone: 'danger' },
  NEEDS_BORROWER_ACTION: { label: 'Action needed', tone: 'warn' },
};

export default function StaffDocumentsPanel({ loanId }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Stale-response guard: if loanId changes while a fetch is in flight, the
    // late response must not clobber the newer loan's documents.
    let stale = false;
    (async () => {
      if (!loanId) { setLoading(false); return; }
      setLoading(true);
      setError(false);
      try {
        const { documents } = await mortgageService.getStaffDocuments(loanId);
        if (stale) return;
        const sorted = [...(documents || [])].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setDocs(sorted);
      } catch (e) {
        if (!stale) {
          console.error('load staff documents', e);
          setError(true);
        }
      } finally {
        if (!stale) setLoading(false);
      }
    })();
    return () => { stale = true; };
  }, [loanId]);

  const download = async (doc) => {
    try {
      const res = await mortgageService.getStaffDocumentDownloadUrl(loanId, doc.id);
      // Same-tab navigation (sibling BorrowerDocuments pattern): survives popup
      // blockers, which window.open from an async continuation does not.
      if (res?.downloadUrl) window.location.href = res.downloadUrl;
    } catch (e) {
      toast.error('Could not open that document');
    }
  };

  const suiteHref = suiteLoanUrl(loanId);

  return (
    <Card pad className="staff-docs">
      <div className="card-header">
        <div className="card-title">
          <Icon name="doc" size={14} stroke={1.8} /><span>Documents</span>
        </div>
        {suiteHref && (
          <Button
            variant="primary"
            size="sm"
            href={suiteHref}
            target="_blank"
            rel="noopener noreferrer"
            title="Manage documents in the Suite console"
          >
            Manage in Suite ↗
          </Button>
        )}
      </div>

      <div className="muted" style={{ margin: '4px 0 12px' }}>
        Documents are managed in the Suite console. This view is read-only.
      </div>

      {loading ? (
        <div className="muted">Loading…</div>
      ) : error ? (
        <div className="muted" style={{ padding: '8px 0' }}>
          Couldn't load documents. Try again later.
        </div>
      ) : docs.length === 0 ? (
        <div className="muted" style={{ padding: '8px 0' }}>
          No documents yet — manage documents in the Suite console.
        </div>
      ) : (
        <div className="staff-docs__list">
          {docs.map((d) => {
            const s = STATUS[d.documentStatus] || { label: d.documentStatus || '—', tone: 'muted' };
            return (
              <div
                key={d.id}
                data-testid="staff-doc-row"
                className="staff-docs__row"
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
                    {d.documentType || '—'}
                    {d.uploadedBy ? ` · ${d.uploadedBy}` : ''}
                    {d.createdAt ? ` · ${new Date(d.createdAt).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <Pill tone={s.tone}>{s.label}</Pill>
                <Button variant="ghost" size="sm" onClick={() => download(d)} title="Download">
                  <Icon name="download" size={12} /> Download
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
