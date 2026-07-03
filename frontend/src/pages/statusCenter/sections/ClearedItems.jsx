import React from 'react';

/*
 * ClearedItems — the "Cleared items" card in the Loan Status Center main column.
 * Ported from the second .card block (green ✓ header, .cond rows with .st-ok /
 * .tag-ok) of docs/design/loan-status-center/MSFG Loan Status Center.html.
 *
 * Consumes the same borrower dashboard `conditions` shape as TodoList; renders
 * only the cleared conditions as a checkmark list. Empty → the design's empty
 * treatment ("Nothing cleared yet").
 */

const CLEARED = new Set(['cleared', 'resolved', 'accepted', 'done']);

function isCleared(status) {
  return CLEARED.has(String(status || '').toLowerCase());
}

export default function ClearedItems({ conditions }) {
  const items = (conditions && Array.isArray(conditions.items)) ? conditions.items : [];
  const cleared = items.filter((c) => isCleared(c.status));

  return (
    <div className="lsc-card">
      <div className="lsc-card-h">
        <span className="lsc-cic lsc-cic--green" aria-hidden="true">✓</span>
        <h3>Cleared items</h3>
        <span className="lsc-cnt">{cleared.length} done</span>
      </div>

      {cleared.length === 0 ? (
        <div className="lsc-empty">Nothing cleared yet.</div>
      ) : (
        cleared.map((c, i) => (
          <div className="lsc-cond" key={c.id != null ? c.id : i}>
            <span className="lsc-st lsc-st--ok" aria-hidden="true">✓</span>
            <div className="lsc-cond-tx">
              <b>{c.conditionText || 'Condition'}</b>
              {c.clearedDate && <span>Cleared {c.clearedDate}</span>}
            </div>
            <span className="lsc-tag lsc-tag--ok">Cleared</span>
          </div>
        ))
      )}
    </div>
  );
}
