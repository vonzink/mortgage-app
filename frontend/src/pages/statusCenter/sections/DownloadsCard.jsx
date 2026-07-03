import React from 'react';

import mortgageService from '../../../services/mortgageService';

/*
 * DownloadsCard — team-shared downloadable files in the Loan Status Center main
 * column. Styled from the .card / .hrow / .fic block of
 * docs/design/loan-status-center/MSFG Loan Status Center.html, with a Download
 * button per row.
 *
 * Consumes documents.fromTeam[] from the borrower dashboard payload:
 *   { id, fileName, documentType, status, uploadedAt, fromLoanTeam:true }
 * Each Download button reuses the SAME service fn BorrowerDocuments uses —
 * mortgageService.getBorrowerDocumentDownloadUrl(suiteLoanId, id) — and
 * navigates to the presigned URL exactly like BorrowerDocuments does.
 */

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

export default function DownloadsCard({ fromTeam, suiteLoanId }) {
  const rows = Array.isArray(fromTeam) ? fromTeam : [];

  const download = async (doc) => {
    if (!suiteLoanId || !doc || doc.id == null) return;
    try {
      const res = await mortgageService.getBorrowerDocumentDownloadUrl(suiteLoanId, doc.id);
      if (res && res.downloadUrl) window.location.href = res.downloadUrl;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('download failed', doc && doc.id, e);
    }
  };

  return (
    <div className="lsc-card">
      <div className="lsc-card-h">
        <span className="lsc-cic lsc-cic--forest" aria-hidden="true">↓</span>
        <h3>Downloads</h3>
        {rows.length > 0 && (
          <span className="lsc-cnt">{rows.length} {rows.length === 1 ? 'file' : 'files'}</span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="lsc-empty">Documents your loan team shares will appear here.</div>
      ) : (
        rows.map((doc, i) => {
          const ext = extChip(doc.fileName);
          const when = formatDate(doc.uploadedAt);
          const sub = [doc.documentType, when ? `shared ${when}` : null]
            .filter(Boolean)
            .join(' · ');
          return (
            <div className="lsc-hrow" key={doc.id != null ? doc.id : i}>
              <div className={`lsc-fic lsc-fic--${ext.toLowerCase()}`} aria-hidden="true">{ext}</div>
              <div className="lsc-hrow-tx">
                <b>{doc.fileName || 'Document'}</b>
                {sub && <span>{sub}</span>}
              </div>
              <button type="button" className="lsc-dl-btn" onClick={() => download(doc)}>
                Download
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
