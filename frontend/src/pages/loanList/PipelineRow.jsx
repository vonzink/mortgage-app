import React from 'react';
import { useNavigate } from 'react-router-dom';
import Pill from '../../components/design/Pill';
import { formatMoneyShort } from '../../utils/format';
import { stageTone } from './stageSlas';

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

export default function PipelineRow({ row }) {
  const navigate = useNavigate();
  const age = daysBetween(row.statusChangedAt);
  const tone = stageTone(row.status, age ?? 0);
  const ltvHigh = row.ltvPct != null && row.ltvPct >= 80;

  return (
    <tr
      className="pipe-row"
      onClick={() => navigate(`/loan/${row.id}`)}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/loan/${row.id}`); }}
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
    </tr>
  );
}
