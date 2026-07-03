import React from 'react';

/*
 * DocumentHistory — the "Document history" card in the Loan Status Center main
 * column. Ported from the .hrow / .fic / .tag block of
 * docs/design/loan-status-center/MSFG Loan Status Center.html.
 *
 * Consumes documents.uploads[] from the borrower dashboard payload:
 *   { id, fileName, documentType, status, uploadedAt, fromLoanTeam:false }
 * Each row: a filetype chip (extension upper-cased), the file name, a sub-line
 * (documentType · uploaded <date>), and a status tag. Status maps:
 *   UPLOADED / SCAN_PENDING / READY_FOR_REVIEW → "In review"
 *   ACCEPTED / CLEARED                          → "Cleared"
 */

// UTC-pinned so a Z-timestamp never renders one day early in negative-offset
// zones. Mirrors StatusRail.jsx / LoanCalendar.jsx formatters.
const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
});

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return DATE_FMT.format(d);
}

function extChip(fileName) {
  const name = String(fileName || '');
  const dot = name.lastIndexOf('.');
  if (dot < 0 || dot === name.length - 1) return 'FILE';
  return name.slice(dot + 1).toUpperCase();
}

const REVIEW = new Set(['UPLOADED', 'SCAN_PENDING', 'READY_FOR_REVIEW']);
const CLEARED = new Set(['ACCEPTED', 'CLEARED']);

function statusTag(status) {
  const s = String(status || '').toUpperCase();
  if (CLEARED.has(s)) return { label: 'Cleared', mod: 'ok' };
  if (REVIEW.has(s)) return { label: 'In review', mod: 'rev' };
  return { label: 'In review', mod: 'rev' };
}

export default function DocumentHistory({ uploads }) {
  const rows = Array.isArray(uploads) ? uploads : [];

  return (
    <div className="lsc-card">
      <div className="lsc-card-h">
        <span className="lsc-cic lsc-cic--forest" aria-hidden="true">≡</span>
        <h3>Document history</h3>
        <span className="lsc-cnt">{rows.length} {rows.length === 1 ? 'file' : 'files'}</span>
      </div>

      {rows.length === 0 ? (
        <div className="lsc-empty">No documents uploaded yet.</div>
      ) : (
        rows.map((doc, i) => {
          const ext = extChip(doc.fileName);
          const tag = statusTag(doc.status);
          const when = formatDate(doc.uploadedAt);
          const sub = [doc.documentType, when ? `uploaded ${when}` : null]
            .filter(Boolean)
            .join(' · ');
          return (
            <div className="lsc-hrow" key={doc.id != null ? doc.id : i}>
              <div className={`lsc-fic lsc-fic--${ext.toLowerCase()}`} aria-hidden="true">{ext}</div>
              <div className="lsc-hrow-tx">
                <b>{doc.fileName || 'Document'}</b>
                {sub && <span>{sub}</span>}
              </div>
              <span className={`lsc-tag lsc-tag--${tag.mod}`}>{tag.label}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
