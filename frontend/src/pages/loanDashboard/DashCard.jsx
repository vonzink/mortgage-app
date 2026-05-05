import React from 'react';

/** Standard panel used for every dashboard section. */
export function DashCard({ icon, title, children, fullWidth, actionRight }) {
  return (
    <div className={`card dashboard-card${fullWidth ? ' dashboard-card--wide' : ''}`}>
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
