import React from 'react';

/*
 * TodoList — the "Your to-do list" card in the Loan Status Center main column.
 * Ported from the .card / .card-h / .cond / .tag / .up-btn block of
 * docs/design/loan-status-center/MSFG Loan Status Center.html.
 *
 * Consumes the borrower dashboard `conditions` shape ClientDashboard uses:
 *   { outstandingCount, items: [{ id, status, conditionText, dueDate }] }
 * Outstanding items → amber "Needed" tag + an Upload button (fires
 * onUploadForCondition). Submitted-but-not-cleared items → a blue "In review"
 * tag, no button. Cleared items are omitted here — they live in ClearedItems.
 */

const CLEARED = new Set(['cleared', 'resolved', 'accepted', 'done']);

function isOutstanding(status) {
  return String(status || '').toLowerCase() === 'outstanding';
}
function isCleared(status) {
  return CLEARED.has(String(status || '').toLowerCase());
}

export default function TodoList({ conditions, onUploadForCondition }) {
  const items = (conditions && Array.isArray(conditions.items)) ? conditions.items : [];
  // Everything not yet cleared belongs on the to-do list.
  const open = items.filter((c) => !isCleared(c.status));
  const openCount = conditions && conditions.outstandingCount != null
    ? conditions.outstandingCount
    : open.filter((c) => isOutstanding(c.status)).length;

  return (
    <div className="lsc-card">
      <div className="lsc-card-h">
        <span className="lsc-cic lsc-cic--amber" aria-hidden="true">!</span>
        <h3>Your to-do list</h3>
        <span className="lsc-cnt">{openCount} open</span>
      </div>

      {open.length === 0 ? (
        <div className="lsc-empty">Nothing needed right now — we'll let you know.</div>
      ) : (
        open.map((c, i) => {
          const outstanding = isOutstanding(c.status);
          return (
            <div className="lsc-cond" key={c.id != null ? c.id : i}>
              <span
                className={`lsc-st ${outstanding ? 'lsc-st--out' : 'lsc-st--rev'}`}
                aria-hidden="true"
              >
                {outstanding ? '▤' : '◷'}
              </span>
              <div className="lsc-cond-tx">
                <b>{c.conditionText || 'Condition'}</b>
                {c.dueDate && <span>Due {c.dueDate}</span>}
              </div>
              <span className={`lsc-tag ${outstanding ? 'lsc-tag--out' : 'lsc-tag--rev'}`}>
                {outstanding ? 'Needed' : 'In review'}
              </span>
              {outstanding && (
                <button
                  type="button"
                  className="lsc-up-btn"
                  onClick={() => onUploadForCondition && onUploadForCondition(c)}
                >
                  Upload
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
