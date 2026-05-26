import React, { useState } from 'react';
import Icon from '../../components/design/Icon';

const STATUSES = [
  'REGISTERED','APPLICATION','DISCLOSURES_SENT','DISCLOSURES_SIGNED',
  'UNDERWRITING','APPROVED','APPRAISAL','INSURANCE',
  'CTC','DOCS_OUT','FUNDED','DISPOSITIONED',
];
const LOAN_TYPES = ['Conventional','FHA','VA','USDA','Jumbo'];

function multiFromSelect(e) {
  return Array.from(e.target.selectedOptions).map((o) => o.value);
}

function ChipSelect({ label, options, value, onChange }) {
  const count = value.length;
  return (
    <label className="pipe-chip">
      <span>{label}</span>
      <select multiple size={1} value={value} onChange={onChange}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {count > 0 && <span className="pipe-chip-badge">{count}</span>}
    </label>
  );
}

export default function FilterChips({ filters, resultCount, onChange, onClear }) {
  const [expanded, setExpanded] = useState(false);

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

  const secondaryActive = (
    filters.conditionsGt != null ||
    filters.closingFrom != null ||
    filters.closingTo != null ||
    filters.stageAgeGt != null
  );

  return (
    <div className="pipe-filter-bar">
      <div className="pipe-chips">
        <ChipSelect
          label="Status"
          options={STATUSES}
          value={filters.statuses}
          onChange={(e) => onChange({ statuses: multiFromSelect(e) })}
        />
        <ChipSelect
          label="Loan type"
          options={LOAN_TYPES}
          value={filters.loanTypes}
          onChange={(e) => onChange({ loanTypes: multiFromSelect(e) })}
        />

        <label className="pipe-chip">
          <span>Amount</span>
          <input type="number" placeholder="min" value={filters.amountMin ?? ''}
                 onChange={(e) => onChange({ amountMin: e.target.value === '' ? null : Number(e.target.value) })} />
          <span className="pipe-chip-sep">–</span>
          <input type="number" placeholder="max" value={filters.amountMax ?? ''}
                 onChange={(e) => onChange({ amountMax: e.target.value === '' ? null : Number(e.target.value) })} />
        </label>

        <button
          type="button"
          className={`pipe-chip pipe-chip--toggle${expanded || secondaryActive ? ' pipe-chip--active' : ''}`}
          onClick={() => setExpanded((v) => !v)}
        >
          <Icon name="settings" size={13} />
          <span>More filters</span>
          {secondaryActive && <span className="pipe-chip-badge">!</span>}
        </button>

        {anyActive && (
          <button type="button" className="pipe-chip pipe-chip--clear" onClick={onClear}>
            Clear all
          </button>
        )}

        <span className="pipe-chips-count">{resultCount} results</span>
      </div>

      {expanded && (
        <div className="pipe-chips pipe-chips--secondary">
          <label className="pipe-chip">
            <input
              type="checkbox"
              checked={filters.conditionsGt != null}
              onChange={(e) => onChange({ conditionsGt: e.target.checked ? 0 : null })}
            />
            <span>Has outstanding conditions</span>
          </label>

          <label className="pipe-chip">
            <span>Closing</span>
            <input type="date" value={filters.closingFrom || ''}
                   onChange={(e) => onChange({ closingFrom: e.target.value || null })} />
            <span className="pipe-chip-sep">to</span>
            <input type="date" value={filters.closingTo || ''}
                   onChange={(e) => onChange({ closingTo: e.target.value || null })} />
          </label>

          <label className="pipe-chip">
            <span>Stage age &gt;</span>
            <input type="number" min={0} style={{ width: 56 }} value={filters.stageAgeGt ?? ''}
                   onChange={(e) => onChange({ stageAgeGt: e.target.value === '' ? null : Number(e.target.value) })} />
            <span>days</span>
          </label>
        </div>
      )}
    </div>
  );
}
