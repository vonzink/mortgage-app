import React from 'react';

/**
 * Standard panel used for every dashboard section.
 *
 * `variant`:
 *   - 'reference' (default) — read-only facts (property, borrower, identifiers)
 *   - 'workflow'            — actionable surfaces (conditions, notes, timeline);
 *                              gets a copper left accent so the eye finds them first.
 */
export function DashCard({ icon, title, children, fullWidth, actionRight, variant }) {
  const cls = [
    'card',
    'dashboard-card',
    fullWidth ? 'dashboard-card--wide' : '',
    variant === 'workflow' ? 'dashboard-card--workflow' : '',
  ].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <div className="dashboard-card-titlebar">
        <h2 className="dashboard-card-title">{icon} {title}</h2>
        {actionRight}
      </div>
      {children}
    </div>
  );
}

/** Renders [label, value] pairs as a <dl>; rows whose value is null/empty are hidden. */
export function DefinitionList({ rows }) {
  return (
    <dl className="dashboard-dl">
      {rows
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([label, value]) => (
          <div key={label} className="dashboard-dl-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}

export function EmptyHint({ children }) {
  return <p className="dashboard-empty">{children}</p>;
}
