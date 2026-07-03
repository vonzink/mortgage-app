import React from 'react';

/*
 * LoanOfficerCard — the "Your loan officer" contact card in the Loan Status
 * Center right column. Ported from the .lo / .lo-row block of
 * docs/design/loan-status-center/MSFG Loan Status Center.html.
 *
 * Consumes payload.loanOfficer: { name, title, nmls, phone, email }. The avatar
 * is the name's initials; phone/email become tel:/mailto: actions; any blank
 * field hides its row. The container renders this card whenever
 * payload.loanOfficer is non-null, so an all-null card is possible — it degrades
 * to a neutral placeholder rather than rendering nothing.
 */

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const blank = (s) => s == null || String(s).trim() === '';

export default function LoanOfficerCard({ loanOfficer }) {
  if (!loanOfficer) return null;

  const { name, title, nmls, phone, email } = loanOfficer;
  const hasName = !blank(name);

  const sub = [
    blank(title) ? null : String(title).trim(),
    blank(nmls) ? null : `NMLS #${String(nmls).trim()}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="lsc-card">
      <div className="lsc-card-h">
        <span className="lsc-cic lsc-cic--green" aria-hidden="true">☎</span>
        <h3>Your loan officer</h3>
      </div>

      <div className="lsc-lo">
        <div className="lsc-lo-ph" aria-hidden="true">{initials(name)}</div>
        <div className="lsc-lo-id">
          <b>{hasName ? name : 'Your loan team'}</b>
          {sub && <span>{sub}</span>}
        </div>
      </div>

      {!blank(phone) && (
        <a className="lsc-lo-row" href={`tel:${String(phone).trim()}`}>
          <span className="lsc-lo-ic" aria-hidden="true">✆</span>
          {String(phone).trim()}
        </a>
      )}
      {!blank(email) && (
        <a className="lsc-lo-row" href={`mailto:${String(email).trim()}`}>
          <span className="lsc-lo-ic" aria-hidden="true">✉</span>
          {String(email).trim()}
        </a>
      )}
      <div className="lsc-kv-pad" />
    </div>
  );
}
