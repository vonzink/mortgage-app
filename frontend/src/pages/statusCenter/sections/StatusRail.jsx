import React from 'react';

/*
 * StatusRail — the left-rail milestone timeline for the Loan Status Center.
 * Ported from the "status rail" (.railcard/.rail/.rl) block of
 * docs/design/loan-status-center/MSFG Loan Status Center.html, rendered as a
 * semantic <ol>/<li>. The container passes the borrower dashboard's
 * `milestones`: exactly 6 { key, label, state, date } where
 * state ∈ {"DONE","CURRENT","UPCOMING"} and date is an ISO date string or null.
 */

// UTC-pinned so a YYYY-MM-DD ISO date (parsed at UTC midnight) never renders one
// day early in negative-offset zones. Mirrors the LoanCalendar.jsx formatters.
const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDate(dateString) {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return null;
  return DATE_FMT.format(d);
}

/** The dot/check glyph for each state, per the design. */
function marker(state) {
  if (state === 'DONE') return '✓';
  if (state === 'CURRENT') return '●';
  return '○';
}

/** Sub-line text: done → its date; current → "In progress"; upcoming → "Upcoming". */
function subline(state, dateString) {
  if (state === 'DONE') return formatDate(dateString) || 'Completed';
  if (state === 'CURRENT') return 'In progress';
  return 'Upcoming';
}

export default function StatusRail({ milestones }) {
  const items = Array.isArray(milestones) ? milestones : [];

  return (
    <ol className="lsc-rail">
      {items.map((m) => {
        const stateClass = String(m.state || '').toLowerCase();
        return (
          <li key={m.key} className={`lsc-rl ${stateClass}`}>
            <span className="lsc-rl-node" aria-hidden="true">{marker(m.state)}</span>
            <span className="lsc-rl-body">
              <b className="lsc-rl-label">{m.label}</b>
              <span className="lsc-rl-sub">{subline(m.state, m.date)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
