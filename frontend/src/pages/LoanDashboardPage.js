import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaChartLine,
  FaHome,
  FaUser,
  FaFileSignature,
  FaCalendarAlt,
  FaIdBadge,
  FaCheck,
  FaCheckCircle,
  FaTimesCircle,
  FaPlus,
  FaPencilAlt,
  FaUserTie,
  FaHistory,
  FaHandshake,
  FaListUl,
  FaTrash,
} from 'react-icons/fa';

import dashboardService from '../services/dashboardService';
import './loanDashboard.css';

/** Status workflow that drives the status dropdown order. Mirrors LoanStatus.java. */
const STATUS_ORDER = [
  'REGISTERED', 'APPLICATION', 'DISCLOSURES_SENT', 'DISCLOSURES_SIGNED',
  'UNDERWRITING', 'APPROVED', 'APPRAISAL', 'INSURANCE',
  'CTC', 'DOCS_OUT', 'FUNDED', 'DISPOSITIONED',
];

const CONDITION_TYPES = ['PriorToDocs', 'PriorToFunding', 'AtClosing', 'PostClose', 'Other'];

/**
 * Loan Dashboard — LO-side view of a single loan in flight. Read-only fields
 * load from /dashboard; writable ones (loan terms, status, conditions) round-trip
 * via dashboardService.
 */
export default function LoanDashboardPage() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTerms, setEditingTerms] = useState(false);
  const [showAddCondition, setShowAddCondition] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await dashboardService.getDashboard(loanId);
      setData(payload);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load dashboard';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => { load(); }, [load]);

  // ── Status change ───────────────────────────────────────────────────────
  const handleStatusChange = async (next) => {
    if (!next || next === data.status) return;
    try {
      await dashboardService.updateStatus(loanId, next, null);
      toast.success(`Status: ${data.status} → ${next}`);
      await load();
    } catch (err) {
      toast.error(`Status update failed: ${err?.response?.data?.message || err.message}`);
    }
  };

  // ── Loan terms edit ─────────────────────────────────────────────────────
  const saveTerms = async (patch) => {
    await dashboardService.patchTerms(loanId, patch);
    toast.success('Loan terms updated');
    setEditingTerms(false);
    await load();
  };

  // ── Conditions ──────────────────────────────────────────────────────────
  const addCondition = async (payload) => {
    await dashboardService.createCondition(loanId, payload);
    toast.success('Condition added');
    setShowAddCondition(false);
    await load();
  };

  const toggleConditionStatus = async (cond) => {
    const next = cond.status === 'Outstanding' ? 'Cleared' : 'Outstanding';
    try {
      await dashboardService.updateCondition(loanId, cond.id, { status: next });
      await load();
    } catch (err) {
      toast.error(`Failed to update condition: ${err?.response?.data?.message || err.message}`);
    }
  };

  const removeCondition = async (cond) => {
    if (!window.confirm(`Delete condition: "${cond.conditionText.slice(0, 80)}…"?`)) return;
    try {
      await dashboardService.deleteCondition(loanId, cond.id);
      await load();
    } catch (err) {
      toast.error(`Delete failed: ${err?.response?.data?.message || err.message}`);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading) return <div className="card" style={{ padding: '2rem' }}>Loading dashboard…</div>;
  if (error || !data) {
    return (
      <div className="card" style={{ padding: '2rem' }}>
        <p style={{ color: '#b91c1c' }}>{error || 'No data available'}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/applications')}>
          <FaArrowLeft /> Back to applications
        </button>
      </div>
    );
  }

  const borrowerName = data.primaryBorrower
    ? `${data.primaryBorrower.firstName || ''} ${data.primaryBorrower.lastName || ''}`.trim()
    : '—';

  const outstandingCount = (data.conditions || []).filter(c => c.status === 'Outstanding').length;

  return (
    <div className="dashboard-root">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="card dashboard-header">
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaChartLine /> Loan Dashboard
          </h1>
          <div className="dashboard-subhead">
            <span>{borrowerName || 'Unnamed borrower'}</span>
            <span className="dashboard-sep">·</span>
            <span>App #{data.applicationNumber || '—'}</span>
            <span className="dashboard-sep">·</span>
            <select
              className={`status-pill status-${(data.status || 'unknown').toLowerCase()} status-select`}
              value={data.status || ''}
              onChange={(e) => handleStatusChange(e.target.value)}
              title="Change loan status"
            >
              {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {outstandingCount > 0 && (
              <>
                <span className="dashboard-sep">·</span>
                <span className="dashboard-warning-pill">{outstandingCount} outstanding</span>
              </>
            )}
          </div>
        </div>
        <div className="dashboard-actions">
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/applications/${loanId}`)}
          >
            View application
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/applications')}
          >
            <FaArrowLeft /> All loans
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* ── Loan Terms (editable) ─────────────────────────────── */}
        <DashCard
          icon={<FaFileSignature />}
          title="Loan Terms"
          actionRight={(
            <button className="btn-icon" onClick={() => setEditingTerms(true)} title="Edit terms">
              <FaPencilAlt />
            </button>
          )}
        >
          {data.loanTerms ? (
            <DefinitionList rows={[
              ['Note rate', formatRate(data.loanTerms.noteRatePercent)],
              ['Note amount', formatMoney(data.loanTerms.noteAmount)],
              ['Base loan amount', formatMoney(data.loanTerms.baseLoanAmount)],
              ['Down payment', formatMoney(data.loanTerms.downPaymentAmount)],
              ['Amortization', data.loanTerms.amortizationType],
              ['Term', data.loanTerms.amortizationTermMonths
                ? `${data.loanTerms.amortizationTermMonths} months` : null],
              ['Lien priority', data.loanTerms.lienPriorityType],
              ['Application received', data.loanTerms.applicationReceivedDate],
            ]} />
          ) : (
            <EmptyHint>
              No terms yet.{' '}
              <button className="link-btn" onClick={() => setEditingTerms(true)}>Add now</button> or import a MISMO.
            </EmptyHint>
          )}
        </DashCard>

        {/* ── Property ───────────────────────────────────────────── */}
        <DashCard icon={<FaHome />} title="Subject Property">
          {data.property ? (
            <DefinitionList rows={[
              ['Address', [
                data.property.addressLine,
                [data.property.city, data.property.state, data.property.zipCode].filter(Boolean).join(', '),
                data.property.county ? `${data.property.county} County` : null,
              ].filter(Boolean).join(' · ')],
              ['Occupancy', prettyEnum(data.property.propertyUse)],
              ['Project type', data.property.projectType],
              ['Attachment', data.property.attachmentType],
              ['Construction', data.property.constructionType],
              ['Year built', data.property.yearBuilt],
              ['Units', data.property.unitsCount],
              ['Purchase price', formatMoney(data.property.purchasePrice)],
              ['Estimated value', formatMoney(data.property.propertyValue)],
            ]} />
          ) : <EmptyHint>No property on file.</EmptyHint>}
        </DashCard>

        {/* ── Primary borrower ───────────────────────────────────── */}
        <DashCard icon={<FaUser />} title="Primary Borrower">
          {data.primaryBorrower ? (
            <DefinitionList rows={[
              ['Name', borrowerName || null],
              ['Email', data.primaryBorrower.email],
              ['Phone', data.primaryBorrower.phone],
              ['Marital status', data.primaryBorrower.maritalStatus],
              ['Citizenship', prettyEnum(data.primaryBorrower.citizenshipType)],
              ['Will occupy', data.primaryBorrower.intentToOccupy === true ? 'Yes'
                : data.primaryBorrower.intentToOccupy === false ? 'No' : null],
            ]} />
          ) : <EmptyHint>No borrower yet.</EmptyHint>}
        </DashCard>

        {/* ── Identifiers ───────────────────────────────────────── */}
        <DashCard icon={<FaIdBadge />} title="Loan Identifiers">
          {hasAnyIdentifier(data.identifiers) ? (
            <DefinitionList rows={[
              ['LendingPad', data.identifiers.lendingpadLoanNumber],
              ['Investor', data.identifiers.investorLoanNumber],
              ['MERS MIN', data.identifiers.mersMin],
            ]} />
          ) : <EmptyHint>No external identifiers yet.</EmptyHint>}
        </DashCard>

        {/* ── Loan Agents ───────────────────────────────────────── */}
        <DashCard icon={<FaUserTie />} title="Loan Agents">
          {data.loanAgents && data.loanAgents.length > 0 ? (
            <ul className="dashboard-list">
              {data.loanAgents.map(a => (
                <li key={a.id} className="dashboard-list-row">
                  <div>
                    <div className="dashboard-strong">{a.user?.displayName || a.user?.email || 'Unassigned'}</div>
                    <div className="dashboard-muted">{a.agentRole}</div>
                  </div>
                  <span className="dashboard-muted-small">{formatDate(a.assignedAt)}</span>
                </li>
              ))}
            </ul>
          ) : <EmptyHint>No agents assigned. Use Loan Agents admin to assign.</EmptyHint>}
        </DashCard>

        {/* ── Closing Information ──────────────────────────────── */}
        <DashCard icon={<FaHandshake />} title="Closing Information">
          {data.closingInformation ? (
            <DefinitionList rows={[
              ['Closing date', data.closingInformation.closingDate],
              ['Closing time', data.closingInformation.closingTime],
              ['Method', data.closingInformation.closingMethod],
              ['Closing company', data.closingInformation.closingCompanyName],
              ['Closing co. phone', data.closingInformation.closingCompanyPhone],
              ['Title company', data.closingInformation.titleCompanyName],
              ['Title co. phone', data.closingInformation.titleCompanyPhone],
              ['Title co. email', data.closingInformation.titleCompanyEmail],
              ['Title insurance', formatMoney(data.closingInformation.titleInsuranceAmount)],
              ['Appraisal mgmt', data.closingInformation.appraisalMgmtCompany],
              ['Appraiser', data.closingInformation.appraiserName],
            ]} />
          ) : <EmptyHint>Closing details will appear once scheduled.</EmptyHint>}
        </DashCard>

        {/* ── Status History (full-width) ──────────────────────── */}
        <DashCard icon={<FaHistory />} title="Status Timeline" fullWidth>
          {data.statusHistory && data.statusHistory.length > 0 ? (
            <ol className="dashboard-timeline">
              {data.statusHistory.map((h, i) => (
                <li key={`${h.transitionedAt}-${i}`} className="dashboard-timeline-row">
                  <span className={`status-pill status-${(h.status || 'unknown').toLowerCase()}`}>
                    {h.status}
                  </span>
                  <div>
                    <div className="dashboard-muted-small">{formatDate(h.transitionedAt)}</div>
                    {h.note && <div>{h.note}</div>}
                  </div>
                </li>
              ))}
            </ol>
          ) : <EmptyHint>No status changes recorded yet.</EmptyHint>}
        </DashCard>

        {/* ── Housing expenses (full-width) ────────────────────── */}
        <DashCard icon={<FaCalendarAlt />} title="Proposed Housing Expenses" fullWidth>
          {data.housingExpenses && data.housingExpenses.length > 0 ? (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Timing</th>
                  <th style={{ textAlign: 'right' }}>Monthly amount</th>
                </tr>
              </thead>
              <tbody>
                {data.housingExpenses.map((he, idx) => (
                  <tr key={idx}>
                    <td>{prettyEnum(he.expenseType)}</td>
                    <td>{he.timingType || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(he.paymentAmount)}</td>
                  </tr>
                ))}
                <tr className="dashboard-table-total">
                  <td colSpan={2}><strong>Total</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <strong>{formatMoney(sumExpenses(data.housingExpenses))}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : <EmptyHint>No housing expenses imported. They populate from a URLA MISMO import.</EmptyHint>}
        </DashCard>

        {/* ── Purchase credits ─────────────────────────────────── */}
        <DashCard icon={<FaHandshake />} title="Purchase Credits">
          {data.purchaseCredits && data.purchaseCredits.length > 0 ? (
            <table className="dashboard-table">
              <thead>
                <tr><th>Type</th><th>Source</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
              </thead>
              <tbody>
                {data.purchaseCredits.map((pc) => (
                  <tr key={pc.id}>
                    <td>{prettyEnum(pc.creditType)}</td>
                    <td>{pc.source || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(pc.amount)}</td>
                  </tr>
                ))}
                <tr className="dashboard-table-total">
                  <td colSpan={2}><strong>Total</strong></td>
                  <td style={{ textAlign: 'right' }}>
                    <strong>{formatMoney(sumCredits(data.purchaseCredits))}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : <EmptyHint>No purchase credits imported.</EmptyHint>}
        </DashCard>

        {/* ── Conditions (full-width, with add) ────────────────── */}
        <DashCard
          icon={<FaListUl />}
          title="Conditions"
          fullWidth
          actionRight={(
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddCondition(true)}>
              <FaPlus /> Add condition
            </button>
          )}
        >
          {data.conditions && data.conditions.length > 0 ? (
            <ul className="dashboard-conditions">
              {data.conditions.map(c => {
                const cleared = c.status !== 'Outstanding';
                return (
                  <li key={c.id} className={`dashboard-condition${cleared ? ' dashboard-condition--cleared' : ''}`}>
                    <button
                      type="button"
                      className="dashboard-condition-toggle"
                      onClick={() => toggleConditionStatus(c)}
                      title={cleared ? 'Reopen' : 'Mark cleared'}
                    >
                      {cleared ? <FaCheckCircle className="ok" /> : <FaTimesCircle className="warn" />}
                    </button>
                    <div className="dashboard-condition-body">
                      <div className="dashboard-condition-text">{c.conditionText}</div>
                      <div className="dashboard-condition-meta">
                        {c.conditionType && <span>{prettyEnum(c.conditionType)}</span>}
                        {c.dueDate && <span>Due {c.dueDate}</span>}
                        {c.clearedAt && <span>Cleared {formatDate(c.clearedAt)}</span>}
                      </div>
                      {c.notes && <div className="dashboard-condition-notes">{c.notes}</div>}
                    </div>
                    <button
                      type="button"
                      className="btn-icon btn-icon--danger"
                      onClick={() => removeCondition(c)}
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : <EmptyHint>No conditions yet. Add one to start the worklist.</EmptyHint>}
        </DashCard>
      </div>

      {/* Modals */}
      {editingTerms && (
        <EditTermsModal
          initial={data.loanTerms || {}}
          onClose={() => setEditingTerms(false)}
          onSave={saveTerms}
        />
      )}
      {showAddCondition && (
        <AddConditionModal
          onClose={() => setShowAddCondition(false)}
          onSave={addCondition}
        />
      )}
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function DashCard({ icon, title, children, fullWidth, actionRight }) {
  return (
    <div className={`card dashboard-card${fullWidth ? ' dashboard-card--wide' : ''}`}>
      <div className="dashboard-card-titlebar">
        <h2 className="dashboard-card-title">{icon} {title}</h2>
        {actionRight}
      </div>
      {children}
    </div>
  );
}

function DefinitionList({ rows }) {
  return (
    <dl className="dashboard-dl">
      {rows
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([label, value]) => (
          <div key={label} className="dashboard-dl-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}

function EmptyHint({ children }) {
  return <p className="dashboard-empty">{children}</p>;
}

function EditTermsModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({
    baseLoanAmount: initial.baseLoanAmount ?? '',
    noteAmount: initial.noteAmount ?? '',
    noteRatePercent: initial.noteRatePercent ?? '',
    downPaymentAmount: initial.downPaymentAmount ?? '',
    amortizationType: initial.amortizationType ?? '',
    amortizationTermMonths: initial.amortizationTermMonths ?? '',
    lienPriorityType: initial.lienPriorityType ?? '',
    applicationReceivedDate: initial.applicationReceivedDate ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    setError(null);
    // Strip empty strings → null (server treats null as "skip this field")
    const payload = Object.fromEntries(Object.entries(form)
      .filter(([, v]) => v !== '' && v !== null && v !== undefined));
    try {
      await onSave(payload);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Save failed');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Edit loan terms" onClose={onClose}>
      <form onSubmit={submit} className="dashboard-form">
        <Row label="Note rate (%)">
          <input type="number" step="0.0001" value={form.noteRatePercent} onChange={set('noteRatePercent')} />
        </Row>
        <Row label="Note amount">
          <input type="number" step="0.01" value={form.noteAmount} onChange={set('noteAmount')} />
        </Row>
        <Row label="Base loan amount">
          <input type="number" step="0.01" value={form.baseLoanAmount} onChange={set('baseLoanAmount')} />
        </Row>
        <Row label="Down payment">
          <input type="number" step="0.01" value={form.downPaymentAmount} onChange={set('downPaymentAmount')} />
        </Row>
        <Row label="Amortization type">
          <select value={form.amortizationType} onChange={set('amortizationType')}>
            <option value="">—</option>
            <option value="Fixed">Fixed</option>
            <option value="AdjustableRate">Adjustable Rate</option>
            <option value="GraduatedPaymentMortgage">Graduated Payment</option>
            <option value="Other">Other</option>
          </select>
        </Row>
        <Row label="Term (months)">
          <input type="number" step="1" value={form.amortizationTermMonths} onChange={set('amortizationTermMonths')} />
        </Row>
        <Row label="Lien priority">
          <select value={form.lienPriorityType} onChange={set('lienPriorityType')}>
            <option value="">—</option>
            <option value="FirstLien">First Lien</option>
            <option value="SecondLien">Second Lien</option>
            <option value="ThirdLien">Third Lien</option>
          </select>
        </Row>
        <Row label="Application received">
          <input type="date" value={form.applicationReceivedDate} onChange={set('applicationReceivedDate')} />
        </Row>
        {error && <p className="dashboard-form-error">{error}</p>}
        <div className="dashboard-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <FaCheck /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function AddConditionModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    conditionText: '',
    conditionType: 'PriorToDocs',
    dueDate: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!form.conditionText.trim()) {
      setError('Condition text is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      if (!payload.dueDate) delete payload.dueDate;
      if (!payload.notes) delete payload.notes;
      await onSave(payload);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Save failed');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Add condition" onClose={onClose}>
      <form onSubmit={submit} className="dashboard-form">
        <Row label="Condition" full>
          <textarea
            rows={3}
            value={form.conditionText}
            onChange={set('conditionText')}
            placeholder='e.g., "Provide most recent 2 months bank statements all pages"'
            autoFocus
          />
        </Row>
        <Row label="Type">
          <select value={form.conditionType} onChange={set('conditionType')}>
            {CONDITION_TYPES.map(t => <option key={t} value={t}>{prettyEnum(t)}</option>)}
          </select>
        </Row>
        <Row label="Due date">
          <input type="date" value={form.dueDate} onChange={set('dueDate')} />
        </Row>
        <Row label="Notes" full>
          <textarea rows={2} value={form.notes} onChange={set('notes')} />
        </Row>
        {error && <p className="dashboard-form-error">{error}</p>}
        <div className="dashboard-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <FaPlus /> {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, children, onClose }) {
  return (
    <div className="dashboard-modal-backdrop" onClick={onClose}>
      <div className="dashboard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dashboard-modal-head">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="dashboard-modal-body">{children}</div>
      </div>
    </div>
  );
}

function Row({ label, children, full }) {
  return (
    <label className={`dashboard-form-row${full ? ' dashboard-form-row--full' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
function formatRate(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return `${n.toFixed(4).replace(/\.?0+$/, '')}%`;
}
function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return iso; }
}
function hasAnyIdentifier(ids) {
  return ids && (ids.lendingpadLoanNumber || ids.investorLoanNumber || ids.mersMin);
}
function sumExpenses(list) { return list.reduce((acc, h) => acc + (Number(h.paymentAmount) || 0), 0); }
function sumCredits(list) { return list.reduce((acc, c) => acc + (Number(c.amount) || 0), 0); }
function prettyEnum(s) {
  if (!s) return '—';
  return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
}
