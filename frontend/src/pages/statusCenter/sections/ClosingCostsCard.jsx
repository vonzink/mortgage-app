import React from 'react';

/*
 * ClosingCostsCard — the "Closing costs" card in the Loan Status Center right
 * column, below PaymentCard. Follows the PaymentCard/SnapshotCard kv-table
 * pattern (.lsc-kv rows, .is-hl highlight, null rows omitted).
 *
 * Consumes payload.closingCosts:
 *   { origination, services, taxesAndGov, prepaidsAndEscrow, other,
 *     totalClosingCosts, sellerCredits, otherCredits, estimatedCashToClose }
 * All fields null-tolerant.
 * - estimatedCashToClose: positive = borrower brings cash ("Estimated cash to
 *   close"); negative = cash back ("Estimated cash back to you"). The value
 *   always renders as an absolute magnitude (so a JSON -0 can't show "-$0.00")
 *   — the heading carries the sign.
 * - Credits arrive as positive magnitudes; the heading carries the sign.
 * - services = sections B+C (did-not-shop + did-shop), combined server-side.
 */

const USD_FMT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usd = (n) => (Number.isFinite(n) ? USD_FMT.format(n) : null);

function Row({ label, value, hl }) {
  if (value == null) return null;
  return (
    <div className={`lsc-kv${hl ? ' is-hl' : ''}`}>
      <span className="lsc-kv-k">{label}</span>
      <span className="lsc-kv-v">{value}</span>
    </div>
  );
}

export default function ClosingCostsCard({ closingCosts }) {
  if (!closingCosts) return null;

  const {
    origination,
    services,
    taxesAndGov,
    prepaidsAndEscrow,
    other,
    totalClosingCosts,
    sellerCredits,
    otherCredits,
    estimatedCashToClose,
  } = closingCosts;

  // All-blank skip (ContactCards' spirit): when no field would produce a row,
  // don't render an empty shell (heading + pad with zero rows).
  const fields = [
    origination, services, taxesAndGov, prepaidsAndEscrow, other,
    totalClosingCosts, sellerCredits, otherCredits, estimatedCashToClose,
  ];
  if (!fields.some((n) => Number.isFinite(n))) return null;

  const cashBack = Number.isFinite(estimatedCashToClose) && estimatedCashToClose < 0;
  const cashLabel = cashBack ? 'Estimated cash back to you' : 'Estimated cash to close';
  const cashValue = usd(Number.isFinite(estimatedCashToClose) ? Math.abs(estimatedCashToClose) : null);

  return (
    <div className="lsc-card">
      <div className="lsc-card-h lsc-card-h--tight">
        <span className="lsc-cic lsc-cic--green" aria-hidden="true">$</span>
        <h3>Closing costs</h3>
      </div>

      <Row label="Origination" value={usd(origination)} />
      <Row label="Services" value={usd(services)} />
      <Row label="Taxes & government" value={usd(taxesAndGov)} />
      <Row label="Prepaids & escrow" value={usd(prepaidsAndEscrow)} />
      <Row label="Other" value={usd(other)} />
      <Row label="Total closing costs" value={usd(totalClosingCosts)} hl />
      <Row label="Seller credits" value={usd(sellerCredits)} />
      <Row label="Other credits" value={usd(otherCredits)} />
      <Row label={cashLabel} value={cashValue} hl />
      <div className="lsc-kv-pad" />
    </div>
  );
}
