import React from 'react';

/*
 * PaymentCard — the "Estimated monthly payment" card in the Loan Status Center
 * right column. Ported from the .kv / .kv.tot block of
 * docs/design/loan-status-center/MSFG Loan Status Center.html.
 *
 * Consumes payload.payment:
 *   { principalAndInterest, taxes, hazardInsurance, mortgageInsurance, hoa, total }
 * Any null component hides its row. The total row gets the highlighted (.is-hl)
 * treatment and a "/ mo" suffix. Currency via Intl.NumberFormat.
 */

const USD_FMT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usd = (n) => (Number.isFinite(n) ? USD_FMT.format(n) : null);

function Row({ label, value, hl, suffix }) {
  if (value == null) return null;
  return (
    <div className={`lsc-kv${hl ? ' is-hl' : ''}`}>
      <span className="lsc-kv-k">{label}</span>
      <span className="lsc-kv-v">{value}{suffix}</span>
    </div>
  );
}

export default function PaymentCard({ payment }) {
  if (!payment) return null;

  const {
    principalAndInterest,
    taxes,
    hazardInsurance,
    mortgageInsurance,
    hoa,
    total,
  } = payment;

  return (
    <div className="lsc-card">
      <div className="lsc-card-h lsc-card-h--tight">
        <span className="lsc-cic lsc-cic--green" aria-hidden="true">$</span>
        <h3>Estimated monthly payment</h3>
      </div>

      <Row label="Principal & interest" value={usd(principalAndInterest)} />
      <Row label="Property taxes" value={usd(taxes)} />
      <Row label="Hazard insurance" value={usd(hazardInsurance)} />
      <Row label="Mortgage insurance" value={usd(mortgageInsurance)} />
      <Row label="HOA" value={usd(hoa)} />
      <Row label="Total" value={usd(total)} hl suffix=" / mo" />
      <div className="lsc-kv-pad" />
    </div>
  );
}
