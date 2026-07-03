import React, { useEffect, useState } from 'react';
import mortgageService from '../../services/mortgageService';
import { Card } from '../design/Card';
import Icon from '../design/Icon';
import Pill from '../design/Pill';

/**
 * The client's loan dashboard — borrower-safe aggregate from the suite (system of record):
 * a plain-language status progress line, key loan facts, outstanding vs cleared conditions,
 * and the proposed monthly housing expense. Renders nothing when the aggregate isn't
 * available (the page degrades to documents + calendar).
 */

const JOURNEY = [
  { status: 'STARTED', label: 'Started' },
  { status: 'APPLICATION_IN_PROGRESS', label: 'Application' },
  { status: 'SUBMITTED', label: 'Submitted' },
  { status: 'IN_UNDERWRITING', label: 'Underwriting' },
  { status: 'APPROVED_WITH_CONDITIONS', label: 'Approved' },
  { status: 'CLEAR_TO_CLOSE', label: 'Clear to Close' },
  { status: 'CLOSING', label: 'Closing' },
  { status: 'FUNDED', label: 'Funded' },
];

const TERMINAL_MESSAGES = {
  WITHDRAWN: 'This application was withdrawn.',
  CANCELLED: 'This application was cancelled.',
  DENIED: 'This application was not approved — your loan officer can walk you through the details.',
  SUSPENDED: 'This application is on hold — your loan officer will reach out about next steps.',
};

const money = (v) =>
  v == null ? null : Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function StatusProgressLine({ status }) {
  const idx = JOURNEY.findIndex((s) => s.status === status);
  if (idx === -1) {
    return TERMINAL_MESSAGES[status] ? (
      <div className="muted" role="status" data-testid="status-terminal">{TERMINAL_MESSAGES[status]}</div>
    ) : null;
  }
  return (
    <ol data-testid="status-progress" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, listStyle: 'none', padding: 0, margin: 0 }}>
      {JOURNEY.map((s, i) => (
        <li
          key={s.status}
          data-current={i === idx || undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
            fontWeight: i === idx ? 700 : 400,
            opacity: i <= idx ? 1 : 0.45,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i <= idx ? 'var(--brand, #80E3A8)' : 'transparent',
              border: '1.5px solid var(--brand, #80E3A8)',
            }}
          />
          {s.label}
          {i < JOURNEY.length - 1 && <span aria-hidden className="muted">—</span>}
        </li>
      ))}
    </ol>
  );
}

export default function ClientDashboard({ suiteLoanId }) {
  const [data, setData] = useState(undefined); // undefined=loading, null=unavailable

  useEffect(() => {
    let stale = false;
    (async () => {
      if (!suiteLoanId) { setData(null); return; }
      const d = await mortgageService.getBorrowerDashboard(suiteLoanId);
      if (!stale) setData(d);
    })();
    return () => { stale = true; };
  }, [suiteLoanId]);

  if (data === undefined) {
    return <Card pad className="client-dash"><div className="muted">Loading your loan…</div></Card>;
  }
  if (data === null) return null;

  const terms = data.loanTerms || {};
  const prop = data.property || {};
  const housing = data.housingExpenses || {};
  const conditions = data.conditions || { outstandingCount: 0, items: [] };
  const outstanding = (conditions.items || []).filter((c) => c.status === 'Outstanding');
  const resolved = (conditions.items || []).filter((c) => c.status !== 'Outstanding');
  const housingRows = [
    ['Property Taxes', housing.proposedTaxesMonthly],
    ['Hazard Insurance', housing.proposedHazardInsuranceMonthly],
    ['Mortgage Insurance', housing.proposedMortgageInsuranceMonthly],
    ['HOA', housing.proposedHoaDuesMonthly],
  ].filter(([, v]) => v != null);
  const housingTotal = housingRows.reduce((s, [, v]) => s + Number(v), 0);
  const address = [prop.addressLine1, [prop.city, prop.state].filter(Boolean).join(', ')]
    .filter(Boolean).join(' — ');

  return (
    <Card pad className="client-dash" data-testid="client-dashboard">
      <div className="card-header">
        <div className="card-title">
          <Icon name="home" size={14} stroke={1.8} /><span>Your loan</span>
        </div>
        {data.loanNumber && <Pill tone="muted">#{data.loanNumber}</Pill>}
      </div>

      <div style={{ margin: '8px 0 12px' }}>
        <StatusProgressLine status={data.status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 12 }}>
        {address && <Fact label="Property" value={address} />}
        {terms.baseLoanAmount != null && <Fact label="Loan amount" value={money(terms.baseLoanAmount)} />}
        {prop.salesPrice != null && <Fact label="Purchase price" value={money(prop.salesPrice)} />}
        {terms.interestRate != null && <Fact label="Note rate" value={`${terms.interestRate}%`} />}
        {data.consummationDate && <Fact label="Closing date" value={data.consummationDate} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        <section>
          <h4 style={{ margin: '0 0 6px' }}>
            Items we need from you{' '}
            <Pill tone={conditions.outstandingCount > 0 ? 'review' : 'active'}>
              {conditions.outstandingCount} outstanding
            </Pill>
          </h4>
          {outstanding.length === 0 ? (
            <div className="muted" style={{ fontSize: 13 }}>Nothing outstanding right now — we'll let you know.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4 }} data-testid="conditions-outstanding">
              {outstanding.map((c, i) => (
                <li key={i} style={{ fontSize: 13 }}>
                  • {c.conditionText}
                  {c.dueDate && <span className="muted"> (due {c.dueDate})</span>}
                </li>
              ))}
            </ul>
          )}
          {resolved.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'grid', gap: 4 }} data-testid="conditions-cleared">
              {resolved.map((c, i) => (
                <li key={i} className="muted" style={{ fontSize: 13, textDecoration: 'line-through' }}>
                  ✓ {c.conditionText}
                </li>
              ))}
            </ul>
          )}
        </section>

        {housingRows.length > 0 && (
          <section data-testid="housing-expense">
            <h4 style={{ margin: '0 0 6px' }}>Proposed monthly housing</h4>
            <table style={{ width: '100%', fontSize: 13 }}>
              <tbody>
                {housingRows.map(([label, v]) => (
                  <tr key={label}>
                    <td className="muted">{label}</td>
                    <td style={{ textAlign: 'right' }}>{money(v)}</td>
                  </tr>
                ))}
                <tr>
                  <td><strong>Total (before P&I)</strong></td>
                  <td style={{ textAlign: 'right' }}><strong>{money(housingTotal)}</strong></td>
                </tr>
              </tbody>
            </table>
          </section>
        )}
      </div>
    </Card>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}
