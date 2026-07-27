import React from 'react';

/*
 * ContactCards — the single "Your loan team" card in the Loan Status Center
 * left rail, directly below LoanOfficerCard. v2.1 consolidation: ONE .lsc-card
 * with a row group per contact (was one card per contact). Purely
 * presentational — payload.contacts is UNCHANGED from v2.
 *
 * Consumes payload.contacts: [{ role, roleLabel, name, company, phone, email }].
 * The server sends contacts already filtered to the borrower-safe role allowlist
 * and in display order — render as received, no client sorting. roleLabel is the
 * per-contact eyebrow (server-mapped, e.g. "Seller's Agent"); a blank roleLabel
 * falls back to the raw role. A contact with every display field blank is
 * skipped; an empty/absent/all-blank list renders nothing (the container also
 * gates on payload.contacts != null — the LO-hid contract).
 */

const ROLE_ICONS = {
  PROCESSOR: '⚙',        // v2.1: borrower's own team (allowlisted first)
  LOAN_ASSISTANT: '✎',   // v2.1
  TITLE_COMPANY: '⚖',
  INSURANCE_AGENT: '☂',
  LISTING_AGENT: '⌂',
  SELLING_AGENT: '⌂',
  ESCROW_OFFICER: '$',
};

const blank = (s) => s == null || String(s).trim() === '';

export default function ContactCards({ contacts }) {
  const rows = Array.isArray(contacts) ? contacts : [];
  const visible = rows.filter(
    (c) => c && !(blank(c.name) && blank(c.company) && blank(c.phone) && blank(c.email)),
  );
  if (visible.length === 0) return null;

  return (
    <div className="lsc-card lsc-contact">
      <div className="lsc-card-h">
        <span className="lsc-cic lsc-cic--forest" aria-hidden="true">☎</span>
        <h3>Your loan team</h3>
      </div>

      {visible.map((c, i) => {
        const icon = ROLE_ICONS[c.role] || '☎';
        const eyebrow = blank(c.roleLabel) ? (c.role || 'Contact') : String(c.roleLabel).trim();
        return (
          <div className="lsc-contact-row" key={`${c.role || 'contact'}-${i}`}>
            <div className="lsc-contact-eyebrow">
              <span className="lsc-contact-eyebrow-ic" aria-hidden="true">{icon}</span>
              {eyebrow}
            </div>

            {(!blank(c.name) || !blank(c.company)) && (
              <div className="lsc-contact-id">
                {!blank(c.name) && <b>{String(c.name).trim()}</b>}
                {!blank(c.company) && <span>{String(c.company).trim()}</span>}
              </div>
            )}

            {!blank(c.phone) && (
              <a className="lsc-lo-row" href={`tel:${String(c.phone).trim()}`}>
                <span className="lsc-lo-ic" aria-hidden="true">✆</span>
                {String(c.phone).trim()}
              </a>
            )}
            {!blank(c.email) && (
              <a className="lsc-lo-row" href={`mailto:${String(c.email).trim()}`}>
                <span className="lsc-lo-ic" aria-hidden="true">✉</span>
                {String(c.email).trim()}
              </a>
            )}
          </div>
        );
      })}
      <div className="lsc-kv-pad" />
    </div>
  );
}
