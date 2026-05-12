import React from 'react';
import Icon from './Icon';
import Pill from './Pill';
import Button from './Button';
import { formatAutoSave } from '../../utils/format';

/**
 * The visual chrome around the multi-step Apply form. The actual form state +
 * step content (LoanInformationStep, BorrowerInformationStep, …) live in the
 * existing react-hook-form orchestration — this file is presentational only.
 */

const STEPS = [
  { id: 1, label: 'Loan Info',    icon: 'home',      sub: 'Purpose & amount' },
  { id: 2, label: 'Borrower',     icon: 'user',      sub: 'Personal details' },
  { id: 3, label: 'Property',     icon: 'bldg',      sub: 'Subject property' },
  { id: 4, label: 'Employment',   icon: 'briefcase', sub: 'Income sources' },
  { id: 5, label: 'Finances',     icon: 'coin',      sub: 'Assets & liabilities' },
  { id: 6, label: 'Declarations', icon: 'flag',      sub: 'Legal questions' },
  { id: 7, label: 'Submit',       icon: 'check',     sub: 'Review & sign' },
];

export const APPLY_STEPS = STEPS;

/* ─── Hero ─────────────────────────────────────────────────────────────── */
export function ApplyHero({
  applicationNumber,
  isEditing,
  lastSavedAt,
  onSaveAndExit,
  onContinue,
  continueLabel = 'Continue',
}) {
  const eyebrow = isEditing
    ? `Editing · ${applicationNumber ? `APP${applicationNumber}` : 'application'}`
    : 'New application';
  return (
    <div className="apply-hero">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="apply-h1">
          {isEditing ? 'Continue your application' : "Let's build your mortgage application"}
        </h1>
        <div className="muted apply-subtitle">
          Seven short sections. Your progress saves automatically — pick up anywhere, any time.
        </div>
      </div>
      <div className="apply-hero-actions">
        {lastSavedAt && (
          <Pill tone="active" dot>{formatAutoSave(lastSavedAt)}</Pill>
        )}
        {onSaveAndExit && (
          <Button onClick={onSaveAndExit} title="Save your progress and leave">
            <Icon name="download" size={14} /> Save &amp; exit
          </Button>
        )}
        {onContinue && (
          <Button variant="primary" onClick={onContinue}>
            {continueLabel} <Icon name="chevron" size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}

// formatAutoSave now imported from utils/format (audit SI-1).

/* ─── Progress strip ───────────────────────────────────────────────────── */
export function ApplyProgressStrip({
  currentStep,           // 1-indexed
  visitedSteps,          // Set<number>
  onStepClick,
  estTimeRemaining,      // string e.g. "18 min" — pass null to hide
}) {
  const idx = currentStep - 1;
  const pct = (currentStep / STEPS.length) * 97;
  return (
    <div className="card apply-progress-card">
      <div className="apply-progress-ring">
        <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: 64, height: 64 }}>
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--ink-line)" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.5" fill="none"
            stroke="var(--forest-700)" strokeWidth="3"
            strokeDasharray={`${pct} 97`} strokeLinecap="round"
          />
        </svg>
        <div className="mono apply-progress-ring-label">
          {currentStep}/{STEPS.length}
        </div>
      </div>

      <div className="apply-progress-grid">
        {STEPS.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          const todo = i > idx;
          const reachable = visitedSteps?.has(s.id);
          const cls = [
            'apply-step-card',
            active && 'apply-step-card--active',
            done && 'apply-step-card--done',
            todo && 'apply-step-card--todo',
            reachable && 'apply-step-card--clickable',
          ].filter(Boolean).join(' ');
          return (
            <button
              key={s.id}
              type="button"
              className={cls}
              onClick={() => reachable && onStepClick?.(s.id)}
              disabled={!reachable}
              aria-current={active ? 'step' : undefined}
              title={s.sub}
            >
              <div className="apply-step-row">
                <div className="apply-step-icon">
                  {done ? <Icon name="check" size={12} stroke={2.4} /> : <Icon name={s.icon} size={12} />}
                </div>
                <div className="apply-step-label">{s.label}</div>
              </div>
              <div className="dim apply-step-sub">{s.sub}</div>
            </button>
          );
        })}
      </div>

      {estTimeRemaining && (
        <div className="apply-progress-time">
          <div className="eyebrow">Est. time left</div>
          <div className="mono apply-progress-time-value">{estTimeRemaining}</div>
        </div>
      )}
    </div>
  );
}

/* ─── Sidebar: live LTV + checklist + LO ───────────────────────────────── */
export function ApplySidebar({ loanAmount, propertyValue, loanType, loanTerm, loanOfficer }) {
  // Indicative monthly is a simple amortization estimate, NOT a rate lock.
  // Falls back to a placeholder if the form hasn't filled in the basics yet.
  const ltv = (Number(propertyValue) > 0 && Number(loanAmount) > 0)
    ? (Number(loanAmount) / Number(propertyValue)) * 100
    : null;
  const indicativeRate = loanType === 'FHA' ? 5.875
                       : loanType === 'VA' ? 5.75
                       : loanType === 'USDA' ? 5.95
                       : 6.125; // Conventional default
  const monthly = (Number(loanAmount) > 0)
    ? estimateMonthlyPayment(Number(loanAmount), indicativeRate, parseInt(loanTerm, 10) || 30)
    : null;

  return (
    <div className="col" style={{ gap: 16 }}>
      {/* Indicative quote — dark forest hero */}
      <div className="card card-pad apply-quote-card">
        <div className="apply-quote-eyebrow">Indicative rate</div>
        <div className="apply-quote-value-row">
          <div className="mono apply-quote-value">
            {indicativeRate.toFixed(3)}<span className="apply-quote-pct">%</span>
          </div>
          <Pill tone="warn">{loanType || 'Conv.'} {loanTerm || '30'}-yr</Pill>
        </div>
        <div className="apply-quote-sub">
          Updated just now · not a rate lock
        </div>
        <div className="apply-quote-hr" />
        <div className="apply-quote-stats">
          <div>
            <div className="apply-quote-stat-label">Est. monthly</div>
            <div className="mono apply-quote-stat-value">
              {monthly != null ? `$${monthly.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
            </div>
          </div>
          <div>
            <div className="apply-quote-stat-label">LTV</div>
            <div className="mono apply-quote-stat-value">
              {ltv != null ? `${ltv.toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* What you'll need */}
      <ChecklistCard />

      {/* Your loan officer */}
      {loanOfficer && (
        <div className="card card-pad">
          <div className="eyebrow apply-lo-eyebrow">Your loan officer</div>
          <div className="apply-lo-row">
            <div className="av av-copper apply-lo-av">{initialsOf(loanOfficer.name)}</div>
            <div>
              <div className="apply-lo-name">{loanOfficer.name}</div>
              <div className="dim apply-lo-meta">
                {loanOfficer.nmls ? `NMLS #${loanOfficer.nmls}` : null}
                {loanOfficer.nmls && loanOfficer.location ? ' · ' : null}
                {loanOfficer.location}
              </div>
            </div>
          </div>
          <div className="row apply-lo-actions">
            {loanOfficer.phone && (
              <Button size="sm" href={`tel:${loanOfficer.phone}`} style={{ flex: 1 }}>
                <Icon name="phone" size={12} /> Call
              </Button>
            )}
            {loanOfficer.email && (
              <Button size="sm" href={`mailto:${loanOfficer.email}`} style={{ flex: 1 }}>
                <Icon name="mail" size={12} /> Email
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* Documents checklist — static for now. Wire to DocumentType.requiredForMilestones later. */
const REQUIRED_DOCS = [
  'Government ID',
  '2 most recent paystubs',
  'W-2s (last 2 years)',
  'Bank statements',
  'Tax returns (last 2 years)',
  'Homeowners insurance',
  'Purchase contract',
  'Gift letter (if applicable)',
  'Award / benefit letters',
];
function ChecklistCard() {
  // No completion tracking yet — show as an informational list.
  // role="list" + role="listitem" so screen readers announce as a list even
  // though the visual styling uses div+span (the boxes aren't real <input>s).
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title"><Icon name="doc" size={14} stroke={1.8} /> What you'll need</div>
        <span className="dim mono apply-checklist-count" aria-label={`${REQUIRED_DOCS.length} items`}>
          0 / {REQUIRED_DOCS.length}
        </span>
      </div>
      <ul className="apply-checklist" aria-label="Documents required">
        {REQUIRED_DOCS.map((t) => (
          <li key={t} className="apply-checklist-row">
            <span className="apply-checklist-box" aria-hidden="true" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function estimateMonthlyPayment(principal, ratePct, years) {
  const r = ratePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function initialsOf(name) {
  if (!name) return 'LO';
  return (name.match(/\b\w/g) || []).slice(0, 2).join('').toUpperCase();
}
