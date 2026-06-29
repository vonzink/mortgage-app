import React, { useState } from 'react';
import { FaArrowRight } from 'react-icons/fa';
import { ModalShell, Row } from './ModalShell';
import { STATUS_ORDER, statusLabel } from './helpers';

/**
 * Move a loan to a new status with an explicit date + optional note.
 *
 * Replaces the orphan in-grid `dash-status-row` dropdown — advancing a loan is
 * a deliberate workflow action, not a stray select, so we promote it to a
 * confirmed modal so the LO can:
 *   - pick the target stage from the suite's server-authoritative legal targets
 *   - backdate the transition (defaults to today; capped at today)
 *   - leave a short note (saved as a dashboard note tagged to the transition,
 *     since the status endpoint itself takes no note field)
 *
 * The two writes (status, optional note) are dispatched via `onSave` so the
 * page can sequence them and refresh once.
 *
 * ── msfg-suite cutover ──────────────────────────────────────────────────────
 * The legal next-states come from GET /loans/{id}/status/transitions
 * (`allowedTransitions`, role-aware), not a hardcoded order. `statusOrder` is a
 * fallback for ordering/empty-transitions resilience.
 */
export function AdvanceStatusModal({
  currentStatus,
  allowedTransitions,
  statusOrder = STATUS_ORDER,
  outstandingCount = 0,
  onClose,
  onSave,
}) {
  // The selectable targets are the suite's allowed transitions when available;
  // ordered by the canonical STATUS_ORDER for a stable dropdown. Falls back to
  // the full order (minus current) if transitions haven't loaded.
  const allowed = Array.isArray(allowedTransitions) && allowedTransitions.length > 0
    ? allowedTransitions
    : statusOrder.filter((s) => s !== currentStatus);
  const targets = statusOrder.filter((s) => allowed.includes(s))
    .concat(allowed.filter((s) => !statusOrder.includes(s)));

  // Default to the first legal target — saves a click in the common
  // "advance by one" path; the LO can still pick any legal target.
  const defaultNext = targets[0] || currentStatus;
  const [targetStatus, setTargetStatus] = useState(defaultNext);
  const [transitionedAt, setTransitionedAt] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!targetStatus || targetStatus === currentStatus) {
      setError('Pick a different status to advance to.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        status: targetStatus,
        transitionedAt: transitionedAt || null,
        note: note.trim() || null,
      });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Save failed');
      setSaving(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const currentIdx = statusOrder.indexOf(currentStatus);
  const isRollback = currentIdx >= 0 && statusOrder.indexOf(targetStatus) < currentIdx;

  return (
    <ModalShell title="Advance status" onClose={onClose}>
      <form onSubmit={submit} className="dashboard-form">
        <Row label="From">
          <div className="advance-status-from">{statusLabel(currentStatus) || '—'}</div>
        </Row>
        <Row label="To">
          <select
            value={targetStatus}
            onChange={(e) => setTargetStatus(e.target.value)}
            autoFocus
          >
            {targets.length === 0 && (
              <option value="">No transitions available</option>
            )}
            {targets.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}{s === currentStatus ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </Row>
        <Row label="On">
          <input
            type="date"
            value={transitionedAt}
            max={today}
            onChange={(e) => setTransitionedAt(e.target.value)}
          />
        </Row>
        <Row label="Note" full>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional — context for the transition (saved as a dashboard note)."
          />
        </Row>

        {/* Soft guardrails — let the LO proceed but make consequences visible. */}
        {isRollback && (
          <p className="dashboard-form-hint">
            Heads up — this rolls the loan <strong>back</strong>. The earlier transition stays in the audit log.
          </p>
        )}
        {outstandingCount > 0 && targetStatus === 'CLEAR_TO_CLOSE' && (
          <p className="dashboard-form-hint dashboard-form-hint--warn">
            {outstandingCount} {outstandingCount === 1 ? 'condition' : 'conditions'} still outstanding — clear before CTC.
          </p>
        )}

        {error && <p className="dashboard-form-error">{error}</p>}

        <div className="dashboard-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <FaArrowRight /> {saving ? 'Advancing…' : `Advance to ${statusLabel(targetStatus) || '—'}`}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
