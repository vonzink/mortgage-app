import React, { useState } from 'react';
import { FaTimes, FaCheck, FaTimes as FaReject, FaSyncAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import workspaceService from '../services/workspaceService';

/**
 * Slide-out review panel. Three actions:
 *   - Accept (notes optional)
 *   - Reject (notes required)
 *   - Request revision (notes required)
 *
 * Backend re-validates the source state, so we don't disable actions client-side
 * based on status — we just let the API tell us if the transition isn't legal.
 */
export default function DocumentReviewPanel({ loanId, doc, onClose, onReviewed }) {
  const [action, setAction] = useState(null); // 'accept' | 'reject' | 'revision' | null
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const requiresNotes = action === 'reject' || action === 'revision';

  const submit = async () => {
    if (!action) return;
    if (requiresNotes && !notes.trim()) {
      toast.warn('Please add a note explaining the decision');
      return;
    }
    setBusy(true);
    try {
      if (action === 'accept') {
        await workspaceService.acceptDocument(loanId, doc.docUuid, notes.trim() || null);
        toast.success('Document accepted');
      } else if (action === 'reject') {
        await workspaceService.rejectDocument(loanId, doc.docUuid, notes.trim());
        toast.success('Document rejected');
      } else if (action === 'revision') {
        await workspaceService.requestRevision(loanId, doc.docUuid, notes.trim());
        toast.success('Revision requested');
      }
      onReviewed?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ws-review-backdrop" onClick={onClose}>
      <aside className="ws-review-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Review document">
        <div className="ws-modal-head">
          <div>
            <h3 style={{ margin: 0 }}>Review</h3>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary, #666)', fontSize: '0.85rem' }}>
              {doc.fileName}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem' }}>
              Current status: <span className="ws-status-badge ws-status-badge--inline">{doc.documentStatus || 'UPLOADED'}</span>
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><FaTimes /></button>
        </div>

        <div className="ws-modal-body">
          <div className="ws-review-actions">
            <ActionButton
              kind="accept"
              active={action === 'accept'}
              onClick={() => setAction('accept')}
              icon={<FaCheck />}
              label="Accept"
            />
            <ActionButton
              kind="revision"
              active={action === 'revision'}
              onClick={() => setAction('revision')}
              icon={<FaSyncAlt />}
              label="Request revision"
            />
            <ActionButton
              kind="reject"
              active={action === 'reject'}
              onClick={() => setAction('reject')}
              icon={<FaReject />}
              label="Reject"
            />
          </div>

          {action && (
            <>
              <label className="ws-form-row" style={{ marginTop: '1rem' }}>
                <span>Notes {requiresNotes && <em style={{ color: '#b91c1c' }}>(required)</em>}</span>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    action === 'reject' ? 'Why is this document being rejected?'
                    : action === 'revision' ? 'What does the borrower need to fix or re-upload?'
                    : 'Optional notes for the audit trail'
                  }
                />
              </label>
              <div className="ws-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
                  {busy ? 'Working…' : `Confirm ${action === 'revision' ? 'request' : action}`}
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function ActionButton({ kind, active, onClick, icon, label }) {
  const palette = {
    accept:   { bg: '#dcfce7', fg: '#166534', border: '#16a34a' },
    revision: { bg: '#fef3c7', fg: '#92400e', border: '#d97706' },
    reject:   { bg: '#fee2e2', fg: '#991b1b', border: '#dc2626' },
  }[kind];

  return (
    <button
      type="button"
      onClick={onClick}
      className="ws-review-action-btn"
      style={{
        background: active ? palette.bg : 'transparent',
        color: active ? palette.fg : 'var(--text-primary)',
        borderColor: active ? palette.border : 'var(--border-color, #d1d5db)',
      }}
    >
      {icon} {label}
    </button>
  );
}
