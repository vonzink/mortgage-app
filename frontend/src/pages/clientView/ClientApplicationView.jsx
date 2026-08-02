import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useRoles from '../../hooks/useRoles';
import { suiteLoanUrl } from '../../services/suiteWeb';
import mortgageService from '../../services/mortgageService';
import { formatPhone } from '../../utils/format';

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

// ── History formatting ────────────────────────────────────────────────────

const EMPLOYMENT_STATUS = { CURRENT: 'Current', PREVIOUS: 'Previous' };
const CLASSIFICATION = { PRIMARY: 'Primary', SECONDARY: 'Secondary' };
const OWNERSHIP_SHARE = { LESS_THAN_25: '< 25% ownership', GREATER_OR_EQUAL_25: '≥ 25% ownership' };
const ADDRESS_TYPE = {
  PRESENT: 'Present',
  PREVIOUS: 'Previous',
  MAILING: 'Mailing',
  TAX_FILING_CURRENT: 'Tax filing (current)',
  TAX_FILING_PREVIOUS: 'Tax filing (prior)',
};
const OWNERSHIP_TYPE = { OWN: 'Own', RENT: 'Rent', LIVING_RENT_FREE: 'Living rent free' };

// The suite orders addresses by the STRING column, so MAILING sorts before PRESENT.
// Re-order to the 1003's reading order: where they live now, then where they lived, then the rest.
const ADDRESS_ORDER = ['PRESENT', 'PREVIOUS', 'MAILING', 'TAX_FILING_CURRENT', 'TAX_FILING_PREVIOUS'];
const addressRank = (t) => {
  const i = ADDRESS_ORDER.indexOf(t);
  return i === -1 ? ADDRESS_ORDER.length : i;
};

/** "2019-03-01" → "Mar 2019". Parsed by parts so the month can't shift in negative-UTC zones. */
const monthYear = (ymd) => {
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd));
  if (!m) return String(ymd);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

/** (2, 4) → "2 yrs 4 mos"; both zero/absent → null. */
const duration = (years, months) => {
  const y = Number(years) || 0;
  const mo = Number(months) || 0;
  if (!y && !mo) return null;
  return [
    y ? `${y} yr${y === 1 ? '' : 's'}` : null,
    mo ? `${mo} mo${mo === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' ');
};

/** A flat month count → "2 yrs 6 mos". Null when absent/zero. */
const monthsSpan = (months) => {
  const m = Number(months) || 0;
  return m ? duration(Math.floor(m / 12), m % 12) : null;
};

const cityStateZip = (o) =>
  [[o.city, o.state].filter(Boolean).join(', '), o.postalCode].filter(Boolean).join(' ');

const streetLine = (line1, line2) => [line1, line2].filter(Boolean).join(', ');

/** One labeled fact inside a history card. Renders nothing when there's no value. */
const Fact = ({ label, value }) =>
  value === null || value === undefined || value === '' ? null : (
    <div className="cv-fact">
      <span className="cv-fact-k">{label}</span>
      <span className="cv-fact-v">{value}</span>
    </div>
  );

const HistorySection = ({ title, items, empty, children }) => (
  <section className="cv-section">
    <h3 className="cv-section-title">{title}</h3>
    {items.length === 0 ? (
      <p className="cv-none">{empty}</p>
    ) : (
      <ul className="cv-entries">{items.map(children)}</ul>
    )}
  </section>
);

/**
 * Read-only render of the client's 1003 (suite BorrowerApplicationResponse). NPI-safe by
 * construction — the payload carries no SSN, only hasSsn. Editing happens via "Fill out
 * application" (the /apply wizard in staff-loan mode, saving onto this loan under the
 * staff member's own name) or in the suite ("Edit in suite ↗", staff only).
 *
 * Work + residence history are NOT in that payload — they live in the suite's income and
 * parties modules, fetched here per-borrower off `application.borrowerId`. All three reads
 * degrade to [] so a module hiccup costs a section, never the page.
 */
export default function ClientApplicationView({ application, loanId }) {
  const navigate = useNavigate();
  const { isStaff } = useRoles();
  const borrowerId = application?.borrowerId;
  const [employments, setEmployments] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [income, setIncome] = useState([]);

  useEffect(() => {
    if (!loanId || !borrowerId) return undefined;
    let stale = false;
    (async () => {
      const [emp, addr, inc] = await Promise.all([
        mortgageService.getSuiteEmployments(loanId, borrowerId),
        mortgageService.getSuiteBorrowerAddresses(loanId, borrowerId),
        mortgageService.getSuiteIncome(loanId, borrowerId),
      ]);
      if (stale) return;
      // The services already promise [] on failure; the Array.isArray belt keeps a future
      // shape change (or a test double) from crashing the whole tab.
      setEmployments(Array.isArray(emp) ? emp : []);
      setAddresses(Array.isArray(addr) ? addr : []);
      setIncome(Array.isArray(inc) ? inc : []);
    })();
    return () => { stale = true; };
  }, [loanId, borrowerId]);

  if (!application) {
    return <p className="cv-empty">No application data for this loan yet.</p>;
  }
  const b = application.borrower || {};
  const l = application.loan || {};
  const name = [b.firstName, b.lastName].filter(Boolean).join(' ') || '—';
  const cityState = [l.city, l.state].filter(Boolean).join(', ');
  const consoleUrl = suiteLoanUrl(loanId);

  // Employment income is an IncomeItem linked back to the employment row it was earned at;
  // several items can hang off one employer (base + overtime + bonus), so sum per employment.
  const monthlyByEmployment = income.reduce((acc, item) => {
    if (!item || !item.employmentId || typeof item.monthlyAmount !== 'number') return acc;
    acc[item.employmentId] = (acc[item.employmentId] || 0) + item.monthlyAmount;
    return acc;
  }, {});

  const residences = [...addresses].sort(
    (x, y) => addressRank(x.addressType) - addressRank(y.addressType) || (x.ordinal || 0) - (y.ordinal || 0),
  );

  return (
    <div className="cv-application">
      <div className="cv-application-head">
        <p className="cv-note">
          The client's application as it stands. Use Fill out application to edit it here with the client.
        </p>
        <div className="cv-application-actions">
          <button
            type="button"
            className="cv-edit-app"
            onClick={() => navigate(`/apply?loan=${loanId}`)}
          >
            Fill out application
          </button>
          {/* Suite users only. This shell is already staff-gated, but the link is gated on its
              own terms rather than inheriting the parent's: it leaves for a system with separate
              permissions, and a client or agent must never be shown a door they cannot open. */}
          {isStaff && consoleUrl && (
            <a className="cv-console-link" href={consoleUrl} target="_blank" rel="noopener noreferrer">
              Edit in suite ↗
            </a>
          )}
        </div>
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
          <Row label="Address" value={streetLine(l.addressLine1, l.addressLine2) || '—'} />
          <Row label="City / State / ZIP" value={[cityState, l.postalCode].filter(Boolean).join(' ') || '—'} />
          <Row label="Property Type" value={l.propertyType} />
          <Row label="Occupancy" value={l.occupancyType} />
          <Row label="Units" value={l.numberOfUnits} />
        </dl>
      </section>

      <HistorySection
        title="Work History"
        items={employments}
        empty="No employment on file."
      >
        {(e) => {
          const start = monthYear(e.startDate);
          const end = e.endDate ? monthYear(e.endDate) : (e.employmentStatus === 'CURRENT' ? 'Present' : null);
          const span = [start, end].filter(Boolean).join(' – ');
          const monthly = monthlyByEmployment[e.id];
          return (
            <li className="cv-entry" key={e.id}>
              <div className="cv-entry-head">
                <span className="cv-entry-title">{e.employerName || 'Employer not named'}</span>
                {e.employmentStatus && (
                  <span className={`cv-badge cv-badge-${String(e.employmentStatus).toLowerCase()}`}>
                    {EMPLOYMENT_STATUS[e.employmentStatus] || e.employmentStatus}
                  </span>
                )}
                {e.selfEmployed && <span className="cv-badge">Self-employed</span>}
              </div>
              {(e.positionTitle || span) && (
                <p className="cv-entry-sub">{[e.positionTitle, span].filter(Boolean).join(' · ')}</p>
              )}
              <div className="cv-facts">
                <Fact label="Monthly income" value={typeof monthly === 'number' ? money(monthly) : null} />
                <Fact
                  label="Employer"
                  value={
                    [streetLine(e.employerAddressLine1, e.employerAddressLine2), cityStateZip({
                      city: e.employerCity, state: e.employerState, postalCode: e.employerPostalCode,
                    })].filter(Boolean).join(', ') || null
                  }
                />
                <Fact label="Phone" value={e.employerPhone ? formatPhone(e.employerPhone) : null} />
                <Fact label="Ownership" value={OWNERSHIP_SHARE[e.ownershipShare] || null} />
                <Fact label="Role" value={CLASSIFICATION[e.classification] || null} />
                <Fact label="In line of work" value={monthsSpan(e.monthsInLineOfWork)} />
              </div>
            </li>
          );
        }}
      </HistorySection>

      <HistorySection
        title="Residence History"
        items={residences}
        empty="No addresses on file."
      >
        {(a) => (
          <li className="cv-entry" key={a.id}>
            <div className="cv-entry-head">
              <span className="cv-entry-title">
                {streetLine(a.addressLine1, a.addressLine2) || 'Address not given'}
              </span>
              {a.addressType && (
                <span className={`cv-badge cv-badge-${String(a.addressType).toLowerCase()}`}>
                  {ADDRESS_TYPE[a.addressType] || a.addressType}
                </span>
              )}
            </div>
            {cityStateZip(a) && <p className="cv-entry-sub">{cityStateZip(a)}</p>}
            <div className="cv-facts">
              <Fact label="Ownership" value={OWNERSHIP_TYPE[a.ownershipType] || null} />
              <Fact
                label="Monthly rent"
                value={typeof a.rentAmount === 'number' ? money(a.rentAmount) : null}
              />
              <Fact
                label="Time at address"
                value={duration(a.residencyDurationYears, a.residencyDurationMonths)}
              />
            </div>
          </li>
        )}
      </HistorySection>
    </div>
  );
}
