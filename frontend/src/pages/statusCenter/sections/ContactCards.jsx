import React from 'react';

/*
 * ContactCards — compact third-party contact cards (title / insurance / agents /
 * escrow) rendered in the Loan Status Center left rail directly below
 * LoanOfficerCard. Follows the LoanOfficerCard row pattern (tel:/mailto: rows,
 * blank fields hidden).
 *
 * Consumes payload.contacts: [{ role, roleLabel, name, company, phone, email }].
 * The server sends contacts already filtered to the borrower-safe role allowlist
 * and in display order — render as received, no client sorting. roleLabel is the
 * card heading (server-mapped, e.g. "Seller's Agent"); a blank roleLabel falls
 * back to the raw role. A contact with every display field blank is skipped; an
 * empty/absent list renders nothing (the container also gates on
 * payload.contacts != null — the LO-hid contract).
 */

const ROLE_ICONS = {
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
    <>
      {visible.map((c, i) => {
        const icon = ROLE_ICONS[c.role] || '☎';
        const heading = blank(c.roleLabel) ? (c.role || 'Contact') : String(c.roleLabel).trim();
        return (
          <div className="lsc-card lsc-contact" key={`${c.role || 'contact'}-${i}`}>
            <div className="lsc-card-h">
              <span className="lsc-cic lsc-cic--forest" aria-hidden="true">{icon}</span>
              <h3>{heading}</h3>
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
            <div className="lsc-kv-pad" />
          </div>
        );
      })}
    </>
  );
}
