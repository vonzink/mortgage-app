import React from 'react';
import Icon from './Icon';
import Pill from './Pill';
import Button from './Button';
import { formatMoneyShort } from '../../utils/format';

/* ──────────────────────────────────────────────────────────────────────────
 * Dashboard chrome — pieces that wrap the existing LoanDashboardPage:
 *   - DashboardHero: breadcrumb + h1 + inline status pill + sub-line + actions
 *   - NoteAmountCard: dark forest hero card with mono $ amount + 4 mini stats
 *   - DashboardKpis: 3 light KPI tiles (base loan, purchase price, LTV)
 *   - MilestoneTimeline: horizontal 8-step status row
 * ────────────────────────────────────────────────────────────────────────── */

const STATUS_BUCKETS = {
  REGISTERED: 'muted',
  APPLICATION: 'muted',
  DISCLOSURES_SENT: 'review',
  DISCLOSURES_SIGNED: 'review',
  UNDERWRITING: 'review',
  APPROVED: 'active',
  APPRAISAL: 'review',
  INSURANCE: 'review',
  CTC: 'active',
  DOCS_OUT: 'active',
  FUNDED: 'active',
  DISPOSITIONED: 'muted',
};

export function dashboardStatusTone(status) {
  return STATUS_BUCKETS[status] || 'muted';
}

export function DashboardHero({
  applicationNumber,
  borrowerName,
  status,
  statusLabel,
  subline,            // node — { loanType, estClose, processorName } style
  onAllLoans,
  onExportMismo,
  onViewApplication,
  onUpdateStatus,
}) {
  const tone = dashboardStatusTone(status);
  return (
    <div className="dash-hero">
      <div className="dash-hero-text">
        <div className="eyebrow dash-breadcrumb">
          <span>Pipeline</span> <Icon name="chevron" size={10} /> <span>Loan dashboard</span>
        </div>
        <div className="dash-title-row">
          <h1 className="dash-h1">{borrowerName || 'Unnamed borrower'}</h1>
          {statusLabel && <Pill tone={tone} dot>{statusLabel}</Pill>}
        </div>
        {subline && <div className="muted dash-subline">{subline}</div>}
      </div>
      <div className="dash-hero-actions">
        {onAllLoans && (
          <Button onClick={onAllLoans} title="Back to loans list">
            <Icon name="chevron" size={12} stroke={2} /> All loans
          </Button>
        )}
        {onExportMismo && (
          <Button onClick={onExportMismo}>
            <Icon name="download" size={14} /> Export MISMO
          </Button>
        )}
        {onViewApplication && (
          <Button onClick={onViewApplication}>
            <Icon name="doc" size={14} /> View application
          </Button>
        )}
        {onUpdateStatus && (
          <Button variant="primary" onClick={onUpdateStatus}>
            <Icon name="edit" size={14} /> Update status
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Note amount card ────────────────────────────────────────────────────── */
export function NoteAmountCard({ noteAmount, noteRate, termMonths, amortizationType, lienPriority }) {
  const { whole, cents } = splitMoney(noteAmount);
  return (
    <div className="card card-pad dash-note-card">
      <div className="dash-note-eyebrow">Note amount</div>
      <div className="mono dash-note-value">
        {whole}{cents && <span className="dash-note-value-cents">{cents}</span>}
      </div>
      <div className="dash-note-stats">
        <NoteStat label="Note rate" value={noteRate ? `${Number(noteRate).toFixed(3)}%` : '—'} />
        <NoteStat label="Term" value={termMonths ? `${termMonths} mo` : '—'} />
        <NoteStat label="Amortization" value={amortizationType || '—'} />
        <NoteStat label="Lien" value={lienPriority || '—'} />
      </div>
    </div>
  );
}

function NoteStat({ label, value }) {
  return (
    <div>
      <div className="dash-note-stat-label">{label}</div>
      <div className="mono dash-note-stat-value">{value}</div>
    </div>
  );
}

function splitMoney(n) {
  if (n == null || n === '') return { whole: '$—', cents: '' };
  const num = Number(n);
  if (isNaN(num)) return { whole: String(n), cents: '' };
  const fixed = num.toFixed(2);
  const [w, c] = fixed.split('.');
  return {
    whole: '$' + Number(w).toLocaleString('en-US'),
    cents: c ? `.${c}` : '',
  };
}

/* ── Light KPI tiles ────────────────────────────────────────────────────── */
export function DashboardKpis({ baseLoanAmount, purchasePrice, propertyValue, ltv, dti, fico }) {
  const ltvColor = ltv != null && ltv >= 80 ? 'var(--copper)' : 'var(--ink-900)';
  return (
    <>
      <KpiTile
        label="Base loan amount"
        value={formatMoneyShort(baseLoanAmount)}
        sub={purchasePrice ? `Down: ${formatMoneyShort((purchasePrice || 0) - (baseLoanAmount || 0))}` : ''}
      />
      <KpiTile
        label="Purchase price"
        value={formatMoneyShort(purchasePrice)}
        sub={propertyValue ? `Est. value: ${formatMoneyShort(propertyValue)}` : ''}
      />
      <KpiTile
        label="LTV"
        value={ltv != null ? `${ltv.toFixed(1)}%` : '—'}
        sub={[dti != null ? `DTI ${dti.toFixed(1)}%` : null, fico ? `FICO ${fico}` : null].filter(Boolean).join(' · ')}
        color={ltvColor}
      />
    </>
  );
}

function KpiTile({ label, value, sub, color }) {
  return (
    <div className="card card-pad dash-kpi">
      <div className="eyebrow dash-kpi-label">{label}</div>
      <div className="mono dash-kpi-value" style={color ? { color } : undefined}>{value}</div>
      {sub && <div className="dim dash-kpi-sub">{sub}</div>}
    </div>
  );
}

// formatMoneyShort now imported from utils/format (audit SI-1).

/* ── Milestone timeline ─────────────────────────────────────────────────── */
export function MilestoneTimeline({ milestones, daysElapsed, daysTarget = 60 }) {
  // milestones: array of { label, date, state: 'done' | 'current' | 'todo' }
  const total = milestones.length;
  const doneCount = milestones.filter((m) => m.state === 'done').length;
  const currentIdx = milestones.findIndex((m) => m.state === 'current');
  const progressedToIdx = currentIdx >= 0 ? currentIdx : doneCount;
  const filledPct = total > 1 ? Math.max(0, Math.min(1, progressedToIdx / (total - 1))) * 100 : 0;

  return (
    <div className="card dash-timeline-card">
      <div className="card-header">
        <div className="card-title"><Icon name="clock" size={14} stroke={1.8} /> Status timeline</div>
        {daysElapsed != null && (
          <div className="dim dash-timeline-meta">
            {daysElapsed} {daysElapsed === 1 ? 'day' : 'days'} elapsed · {daysTarget}-day target
          </div>
        )}
      </div>
      <div className="dash-timeline-body">
        <div className="dash-timeline-grid" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
          <div className="dash-timeline-track" />
          <div className="dash-timeline-track-fill" style={{ width: `calc(${filledPct}% * (1 - 12 / 100))` }} />
          {milestones.map((m, i) => (
            <div key={i} className="dash-timeline-cell">
              <div className={`dash-timeline-node dash-timeline-node--${m.state}`}>
                {m.state === 'done' && <Icon name="check" size={10} stroke={3.5} />}
                {m.state === 'current' && <div className="dash-timeline-current-dot" />}
              </div>
              <div className={`dash-timeline-label${m.state === 'todo' ? ' dim' : ''}`}>{m.label}</div>
              <div className="mono dim dash-timeline-date">{m.date || '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
