import React from 'react';

const SIZE_OPTIONS = [10, 25, 50, 100];

export default function Pager({ page, size, totalElements, totalPages, onPage, onSize }) {
  const first = totalElements === 0 ? 0 : page * size + 1;
  const last  = Math.min((page + 1) * size, totalElements);
  return (
    <div className="pipe-pager">
      <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)} className="btn btn-sm">◀</button>
      <span className="pipe-pager-info">Page {page + 1} of {Math.max(totalPages, 1)}</span>
      <button type="button" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)} className="btn btn-sm">▶</button>
      <select value={size} onChange={(e) => onSize(Number(e.target.value))} className="pipe-pager-size">
        {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s} per page</option>)}
      </select>
      <span className="pipe-pager-info">Showing {first}–{last} of {totalElements}</span>
    </div>
  );
}
