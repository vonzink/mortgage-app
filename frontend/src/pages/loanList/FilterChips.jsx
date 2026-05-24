import React from 'react';

const STATUSES = [
  'REGISTERED','APPLICATION','DISCLOSURES_SENT','DISCLOSURES_SIGNED',
  'UNDERWRITING','APPROVED','APPRAISAL','INSURANCE',
  'CTC','DOCS_OUT','FUNDED','DISPOSITIONED',
];
const LOAN_TYPES = ['Conventional','FHA','VA','USDA','Jumbo'];

function multiFromSelect(e) {
  return Array.from(e.target.selectedOptions).map((o) => o.value);
}

export default function FilterChips({ filters, resultCount, onChange, onClear }) {
  const anyActive = (
    filters.statuses.length > 0 ||
    filters.assignedLoId != null ||
    filters.conditionsGt != null ||
    filters.closingFrom != null ||
    filters.closingTo != null ||
    filters.stageAgeGt != null ||
    filters.loanTypes.length > 0 ||
    filters.amountMin != null ||
    filters.amountMax != null
  );

  return (
    <div className="pipe-chips">
      <label className="pipe-chip">
        <span>Status</span>
        <select multiple size={1} value={filters.statuses}
                onChange={(e) => onChange({ statuses: multiFromSelect(e) })}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label className="pipe-chip">
        <span>Loan type</span>
        <select multiple size={1} value={filters.loanTypes}
                onChange={(e) => onChange({ loanTypes: multiFromSelect(e) })}>
          {LOAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      <label className="pipe-chip">
        <input
          type="checkbox"
          checked={filters.conditionsGt != null}
          onChange={(e) => onChange({ conditionsGt: e.target.checked ? 0 : null })}
        />
        <span>Has outstanding conditions</span>
      </label>

      <label className="pipe-chip">
        <span>Closing from</span>
        <input type="date" value={filters.closingFrom || ''}
               onChange={(e) => onChange({ closingFrom: e.target.value || null })} />
      </label>

      <label className="pipe-chip">
        <span>to</span>
        <input type="date" value={filters.closingTo || ''}
               onChange={(e) => onChange({ closingTo: e.target.value || null })} />
      </label>

      <label className="pipe-chip">
        <span>Stage age &gt;</span>
        <input type="number" min={0} style={{ width: 64 }} value={filters.stageAgeGt ?? ''}
               onChange={(e) => onChange({ stageAgeGt: e.target.value === '' ? null : Number(e.target.value) })} />
        <span>days</span>
      </label>

      <label className="pipe-chip">
        <span>Amount</span>
        <input type="number" placeholder="min" style={{ width: 96 }} value={filters.amountMin ?? ''}
               onChange={(e) => onChange({ amountMin: e.target.value === '' ? null : Number(e.target.value) })} />
        <span>–</span>
        <input type="number" placeholder="max" style={{ width: 96 }} value={filters.amountMax ?? ''}
               onChange={(e) => onChange({ amountMax: e.target.value === '' ? null : Number(e.target.value) })} />
      </label>

      {anyActive && (
        <button type="button" className="btn btn-sm" onClick={onClear}>Clear all</button>
      )}
      <span className="pipe-chips-count">({resultCount} results)</span>
    </div>
  );
}
