import React from 'react';

/*
 * AppraisalCard — the "Appraisal" tracker card in the Loan Status Center right
 * column. Ported from the .appr-steps / .appr-cap / .kv block of
 * docs/design/loan-status-center/MSFG Loan Status Center.html.
 *
 * There is NO dedicated appraisal payload field — the 4-segment tracker is
 * DERIVED from payload.keyDates[]. A segment is "filled" iff its APPRAISAL_* key
 * has a non-null date. The header count reflects the furthest reached stage.
 * Purchase price comes from loanSnapshot.purchasePrice; appraised value is
 * always "Pending" (the payload carries no appraised figure).
 */

const SEGMENTS = [
  { key: 'APPRAISAL_ORDERED', label: 'Ordered' },
  { key: 'APPRAISAL_SCHEDULED', label: 'Scheduled' },
  { key: 'APPRAISAL_INSPECTED', label: 'Inspected' },
  { key: 'APPRAISAL_REPORT_RECEIVED', label: 'Report' },
];

const USD_FMT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
});

function formatUtcDate(value) {
  if (!value) return null;
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : DATE_FMT.format(d);
}

export default function AppraisalCard({ keyDates, purchasePrice }) {
  const byKey = new Map(
    (Array.isArray(keyDates) ? keyDates : [])
      .filter((d) => d && d.date)
      .map((d) => [d.key, d.date]),
  );

  const segs = SEGMENTS.map((s) => ({ ...s, date: byKey.get(s.key) || null }));
  const reachedIdx = segs.reduce((acc, s, i) => (s.date ? i : acc), -1);
  const stageLabel = reachedIdx >= 0 ? segs[reachedIdx].label : 'Not started';

  const orderedDate = formatUtcDate(byKey.get('APPRAISAL_ORDERED'));
  const inspectedDate = formatUtcDate(byKey.get('APPRAISAL_INSPECTED'));
  const price = Number.isFinite(purchasePrice) ? USD_FMT.format(purchasePrice) : null;

  return (
    <div className="lsc-card">
      <div className="lsc-card-h">
        <span className="lsc-cic lsc-cic--forest" aria-hidden="true">⌖</span>
        <h3>Appraisal</h3>
        <span className="lsc-cnt">{stageLabel}</span>
      </div>

      <div className="lsc-appr-steps" aria-hidden="true">
        {segs.map((s) => (
          <i key={s.key} className={s.date ? 'is-on' : undefined} />
        ))}
      </div>
      <div className="lsc-appr-cap">
        {segs.map((s) => (
          <span key={s.key}>{s.label}</span>
        ))}
      </div>

      {orderedDate && (
        <div className="lsc-kv">
          <span className="lsc-kv-k">Ordered</span>
          <span className="lsc-kv-v">{orderedDate}</span>
        </div>
      )}
      {inspectedDate && (
        <div className="lsc-kv">
          <span className="lsc-kv-k">Inspection</span>
          <span className="lsc-kv-v">{inspectedDate}</span>
        </div>
      )}
      {price && (
        <div className="lsc-kv">
          <span className="lsc-kv-k">Purchase price</span>
          <span className="lsc-kv-v">{price}</span>
        </div>
      )}
      <div className="lsc-kv">
        <span className="lsc-kv-k">Appraised value</span>
        <span className="lsc-kv-v lsc-kv-v--muted">Pending</span>
      </div>
      <div className="lsc-kv-pad" />
    </div>
  );
}
