import React from 'react';
import { useNavigate } from 'react-router-dom';
import useRoles from '../../hooks/useRoles';
import Pill from '../../components/design/Pill';
import { formatMoneyShort } from '../../utils/format';
import { stageTone } from './stageSlas';
import { suiteLoanUrl } from '../../services/suiteWeb';

function statusTone(status) {
  if (!status) return 'muted';
  if (status === 'FUNDED' || status === 'CTC' || status === 'DOCS_OUT') return 'active';
  if (status === 'DISPOSITIONED') return 'danger';
  if (status === 'REGISTERED' || status === 'APPLICATION') return 'muted';
  return 'review';
}

function daysBetween(isoStart, end = Date.now()) {
  if (!isoStart) return null;
  const ms = end - new Date(isoStart).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function formatMonthDay(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

export default function PipelineRow({ row, showSuiteLink = false }) {
  const navigate = useNavigate();
  const { isStaff } = useRoles();
  const age = daysBetween(row.statusChangedAt);
  const tone = stageTone(row.status, age ?? 0);
  const ltvHigh = row.ltvPct != null && row.ltvPct >= 80;
  // Staff work the LO Loan Dashboard; clients open THEIR Loan Status Center (status,
  // conditions, documents, key dates). Sending a borrower to /loan/{id} lands them in
  // staff tooling that also 403s for them (walkthrough finding, 2026-07-03).
  const detailsPath = isStaff ? `/loan/${row.id}` : `/dashboard?loan=${row.id}`;

  return (
    <tr
      className="pipe-row"
      onClick={() => navigate(detailsPath)}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(detailsPath); }}
    >
      <td className="pipe-cell pipe-cell--name">
        <div className="pipe-name">{row.borrowerName || '(no borrower)'}</div>
        <div className="pipe-name-sub">
          {[
            [row.city, row.state].filter(Boolean).join(', '),
            row.applicationNumber ? `#${row.applicationNumber}` : null,
          ].filter(Boolean).join(' · ') || ' '}
        </div>
      </td>
      <td className="pipe-cell">
        <Pill tone={statusTone(row.status)} dot>{row.status || '—'}</Pill>
        {age != null && (
          <div
            className={`pipe-age pipe-age--${tone}`}
            title={`In current stage for ${age} day${age === 1 ? '' : 's'}`}
          >
            in stage {age}d
          </div>
        )}
      </td>
      <td className="pipe-cell pipe-cell--num">
        {row.outstandingConditions > 0
          ? <span className="pipe-cond">{row.outstandingConditions}</span>
          : <span className="pipe-cond pipe-cond--zero">0</span>}
      </td>
      <td className="pipe-cell pipe-cell--num">
        <span className="pipe-money">{formatMoneyShort(row.loanAmount)}</span>
        {' '}
        <span
          className={`pipe-ltv${ltvHigh ? ' pipe-ltv--high' : ''}`}
          title={ltvHigh
            ? `LTV ${row.ltvPct?.toFixed(1)}% — above 80% threshold (MI / pricing impact)`
            : `Loan-to-Value ratio`}
        >
          / {row.ltvPct != null ? `${row.ltvPct.toFixed(1)}%` : '—'}
          {ltvHigh && <span aria-hidden> ⚠</span>}
        </span>
      </td>
      <td className="pipe-cell">{formatMonthDay(row.estClosingDate)}</td>
      <td className="pipe-cell">{row.assignedLoName || '—'}</td>
      <td className="pipe-cell pipe-cell--suite">
        {showSuiteLink && suiteLoanUrl(row.id) && (
          <a
            data-testid="open-in-suite"
            className="btn btn-sm"
            href={suiteLoanUrl(row.id)}
            target="_blank"
            rel="noopener noreferrer"
            title="Open this loan in the msfg-suite console"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            Suite ↗
          </a>
        )}
      </td>
    </tr>
  );
}
