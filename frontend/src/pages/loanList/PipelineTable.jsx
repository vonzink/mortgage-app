import React from 'react';
import PipelineRow from './PipelineRow';

const COLUMNS = [
  { id: 'borrower',     label: 'Borrower / Property',   sortable: false },
  { id: 'status',       label: 'Status',                sortable: true, field: 'statusChangedAt' },
  { id: 'conditions',   label: 'Cond.',                 sortable: false },
  { id: 'amount',       label: 'Amount / LTV',          sortable: true, field: 'loanAmount' },
  { id: 'close',        label: 'Close',                 sortable: false },
  { id: 'lo',           label: 'LO',                    sortable: false },
  { id: 'suite',        label: '',                      sortable: false },
];

function SortHeader({ col, sort, onSort }) {
  const isActive = sort.field === col.field;
  const next = isActive && sort.dir === 'desc' ? 'asc' : 'desc';
  return (
    <th>
      <button
        type="button"
        className={`pipe-th-sort${isActive ? ' is-active' : ''}`}
        onClick={() => onSort(col.field, next)}
      >
        {col.label}
        <span className="pipe-th-arrow">{isActive ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );
}

export default function PipelineTable({ rows, sort, onSort, showSuiteLink = false }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="pipe-empty">
        <p>No loans match your filters.</p>
      </div>
    );
  }
  return (
    <table className="pipe-table">
      <thead>
        <tr>
          {COLUMNS.map((c) => c.sortable
            ? <SortHeader key={c.id} col={c} sort={sort} onSort={onSort} />
            : <th key={c.id}>{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => <PipelineRow key={r.id} row={r} showSuiteLink={showSuiteLink} />)}
      </tbody>
    </table>
  );
}
