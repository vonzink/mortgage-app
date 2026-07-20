import React from 'react';
import { suiteLoanUrl } from '../../services/suiteWeb';

const money = (n) =>
  typeof n === 'number'
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '—';

const Row = ({ label, value }) => (
  <div className="cv-row">
    <dt className="cv-k">{label}</dt>
    <dd className="cv-v">{value ?? '—'}</dd>
  </div>
);

/**
 * Read-only render of the client's 1003 (suite BorrowerApplicationResponse). NPI-safe by
 * construction — the payload carries no SSN, only hasSsn. Editing is intentionally NOT here:
 * the loan's authoritative editors live in the suite console ("Edit in console ↗").
 */
export default function ClientApplicationView({ application, loanId }) {
  if (!application) {
    return <p className="cv-empty">No application data for this loan yet.</p>;
  }
  const b = application.borrower || {};
  const l = application.loan || {};
  const name = [b.firstName, b.lastName].filter(Boolean).join(' ') || '—';
  const cityState = [l.city, l.state].filter(Boolean).join(', ');
  const consoleUrl = suiteLoanUrl(loanId);

  return (
    <div className="cv-application">
      <div className="cv-application-head">
        <p className="cv-note">Read-only — the client's submitted application. Edits are made in the console.</p>
        {consoleUrl && (
          <a className="cv-console-link" href={consoleUrl} target="_blank" rel="noopener noreferrer">
            Edit in console ↗
          </a>
        )}
      </div>

      <section className="cv-section">
        <h3 className="cv-section-title">Borrower</h3>
        <dl className="cv-grid">
          <Row label="Name" value={name} />
          <Row label="Email" value={b.email} />
          <Row label="Cell" value={b.cellPhone} />
          <Row label="Home" value={b.homePhone} />
          <Row label="Marital" value={b.maritalStatus} />
          <Row label="SSN on file" value={b.hasSsn ? 'Yes' : 'No'} />
        </dl>
      </section>

      <section className="cv-section">
        <h3 className="cv-section-title">Loan</h3>
        <dl className="cv-grid">
          <Row label="Loan #" value={application.loanNumber} />
          <Row label="Mortgage Type" value={l.mortgageType} />
          <Row label="Base Loan Amount" value={money(l.baseLoanAmount)} />
          <Row label="Down Payment" value={money(l.downPaymentAmount)} />
          <Row label="Sales Price" value={money(l.salesPrice)} />
          <Row label="Estimated Value" value={money(l.estimatedValue)} />
        </dl>
      </section>

      <section className="cv-section">
        <h3 className="cv-section-title">Subject Property</h3>
        <dl className="cv-grid">
          <Row label="Address" value={[l.addressLine1, l.addressLine2].filter(Boolean).join(', ') || '—'} />
          <Row label="City / State / ZIP" value={[cityState, l.postalCode].filter(Boolean).join(' ') || '—'} />
          <Row label="Property Type" value={l.propertyType} />
          <Row label="Occupancy" value={l.occupancyType} />
          <Row label="Units" value={l.numberOfUnits} />
        </dl>
      </section>
    </div>
  );
}
