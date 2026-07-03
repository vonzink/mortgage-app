import React, { useId, useState } from 'react';
import { groupLoans } from '../loanGroups';

/** "IN_UNDERWRITING" → "In underwriting" (sentence-case, borrower-facing). */
export function humanizeStatus(status) {
  if (!status) return 'In progress';
  const words = String(status).toLowerCase().split('_').filter(Boolean);
  const s = words.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Option label: "#{loanNumber || shortId} — {humanized status}". */
function optionLabel(loan) {
  const shortId = String(loan.id || '').split('-')[0];
  return `#${loan.loanNumber || shortId} — ${humanizeStatus(loan.status)}`;
}

/**
 * Labeled loan picker for borrowers with more than one loan. A plain <select>
 * with Active/Past optgroups (accessible by default; the visual polish is CSS);
 * loans whose final status change is >12 months old stay hidden behind a
 * "View older loans" expander that adds a third "Older" optgroup.
 */
export default function LoanSelector({ loans, selectedId, onSelect }) {
  const selectId = useId();
  const [showOlder, setShowOlder] = useState(false);
  const { active, past, older } = groupLoans(loans);

  const renderGroup = (label, group) =>
    group.length > 0 && (
      <optgroup label={label}>
        {group.map((loan) => (
          <option key={loan.id} value={loan.id}>{optionLabel(loan)}</option>
        ))}
      </optgroup>
    );

  return (
    <div className="lsc-selector">
      <label className="lsc-selector-label" htmlFor={selectId}>Loan</label>
      <select
        id={selectId}
        className="lsc-selector-select"
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
      >
        {renderGroup('Active', active)}
        {renderGroup('Past', past)}
        {showOlder && renderGroup('Older', older)}
      </select>
      {older.length > 0 && !showOlder && (
        <button
          type="button"
          className="lsc-selector-older"
          onClick={() => setShowOlder(true)}
        >
          View older loans
        </button>
      )}
    </div>
  );
}
