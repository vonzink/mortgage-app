import React from 'react';

/*
 * SnapshotCard — the "Your loan at a glance" card in the Loan Status Center
 * right column. Ported from the .kv / .kv.tot block of
 * docs/design/loan-status-center/MSFG Loan Status Center.html.
 *
 * Consumes payload.loanSnapshot:
 *   { program, noteRate, purchasePrice, baseLoanAmount, totalLoanAmount,
 *     financedFeesAmount, cashToClose }
 * Any null field hides its row. The total-loan row gets the highlighted (.is-hl)
 * treatment. Currency + percent via Intl.NumberFormat.
 */

const USD_FMT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const RATE_FMT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

const usd = (n) => (Number.isFinite(n) ? USD_FMT.format(n) : null);
const pct = (n) => (Number.isFinite(n) ? `${RATE_FMT.format(n)}%` : null);
const str = (s) => (s == null || s === '' ? null : String(s));

function Row({ label, value, hl }) {
  if (value == null) return null;
  return (
    <div className={`lsc-kv${hl ? ' is-hl' : ''}`}>
      <span className="lsc-kv-k">{label}</span>
      <span className="lsc-kv-v">{value}</span>
    </div>
  );
}

export default function SnapshotCard({ loanSnapshot }) {
  if (!loanSnapshot) return null;

  const {
    program,
    noteRate,
    purchasePrice,
    baseLoanAmount,
    totalLoanAmount,
    financedFeesAmount,
    cashToClose,
  } = loanSnapshot;

  return (
    <div className="lsc-card">
      <div className="lsc-card-h lsc-card-h--tight">
        <span className="lsc-cic lsc-cic--forest" aria-hidden="true">⌂</span>
        <h3>Your loan at a glance</h3>
      </div>

      <Row label="Program" value={str(program)} />
      <Row label="Note rate" value={pct(noteRate)} />
      <Row label="Purchase price" value={usd(purchasePrice)} />
      <Row label="Base loan amount" value={usd(baseLoanAmount)} />
      <Row label="Financed fees" value={usd(financedFeesAmount)} />
      <Row label="Total loan amount" value={usd(totalLoanAmount)} hl />
      <Row label="Est. cash to close" value={usd(cashToClose)} />
      <div className="lsc-kv-pad" />
    </div>
  );
}
