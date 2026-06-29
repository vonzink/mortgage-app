import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaHome,
  FaUser,
  FaFileSignature,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaPlus,
  FaPencilAlt,
  FaUserTie,
  FaHistory,
  FaHandshake,
  FaListUl,
  FaTrash,
  FaStickyNote,
} from 'react-icons/fa';

import dashboardService from '../services/dashboardService';
import mortgageService from '../services/mortgageService';
import { pushRecentLoan } from '../utils/recentLoans';
import './loanDashboard.css';
import './LoanDashboardPage.design.css';

import { DashCard, DefinitionList, EmptyHint } from './loanDashboard/DashCard';
import { EditTermsModal } from './loanDashboard/EditTermsModal';
import { AddConditionModal } from './loanDashboard/AddConditionModal';
import { AdvanceStatusModal } from './loanDashboard/AdvanceStatusModal';
import {
  formatMoney, formatRate, formatDate,
  sumExpenses, sumCredits, prettyEnum,
} from './loanDashboard/format';
import {
  DashboardHero, NoteAmountCard, DashboardKpis, MilestoneTimeline,
} from '../components/design/DashboardChrome';
import {
  STATUS_ORDER,
  buildMilestones, buildStatusLabel,
  computeDaysElapsed, findProcessor,
} from './loanDashboard/helpers';

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
  const [showAdvanceStatus, setShowAdvanceStatus] = useState(false);
  const [allowedTransitions, setAllowedTransitions] = useState([]);
  const [newNote, setNewNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await dashboardService.getDashboard(loanId);
      setData(payload);
      // Cache this loan for the TopBar typeahead's empty state.
      try {
        pushRecentLoan({
          id: payload?.id ?? loanId,
          applicationNumber: payload?.applicationNumber,
          borrowerName: payload?.primaryBorrower
            ? `${payload.primaryBorrower.firstName || ''} ${payload.primaryBorrower.lastName || ''}`.trim()
            : null,
        });
      } catch { /* never block the page on a cache write */ }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load dashboard';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => { load(); }, [load]);

  // Open the Advance-status modal, pre-fetching the suite's server-authoritative
  // legal next-states so the modal only offers transitions the lifecycle allows.
  const openAdvanceStatus = async () => {
    try {
      const t = await dashboardService.getTransitions(loanId);
      setAllowedTransitions(t.allowedTransitions || []);
    } catch (e) {
      // Non-fatal — the modal falls back to the canonical order if transitions fail.
      console.warn('Failed to load status transitions:', e);
      setAllowedTransitions([]);
    }
    setShowAdvanceStatus(true);
  };

  // Advance the loan via the AdvanceStatusModal. The modal owns the date +
  // optional note; the note is carried as the transition `reason` (the suite
  // status endpoint records it on the history row). We refresh once after.
  const advanceStatus = async ({ status, transitionedAt, note }) => {
    const from = data.status;
    await dashboardService.updateStatus(loanId, status, transitionedAt, note || undefined);
    toast.success(`Status: ${from} → ${status}${transitionedAt ? ` (${transitionedAt})` : ''}`);
    setShowAdvanceStatus(false);
    await load();
  };

  const saveTerms = async (patch) => {
    await dashboardService.patchTerms(loanId, patch);
    toast.success('Loan terms updated');
    setEditingTerms(false);
    await load();
  };

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

  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      await dashboardService.createNote(loanId, newNote.trim());
      setNewNote('');
      await load();
    } catch (err) {
      toast.error(`Failed to add note: ${err?.response?.data?.message || err.message}`);
    }
  };

  const removeNote = async (note) => {
    try {
      await dashboardService.deleteNote(loanId, note.id);
      await load();
    } catch (err) {
      toast.error(`Delete failed: ${err?.response?.data?.message || err.message}`);
    }
  };

  if (loading) return <div className="card" style={{ padding: '2rem' }}>Loading dashboard…</div>;
  if (error || !data) {
    return (
      <div className="card" style={{ padding: '2rem' }}>
        <p style={{ color: '#a8423a' }}>{error || 'No data available'}</p>
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

  // Derive a friendly status label (e.g. UNDERWRITING → "Underwriting · day 3")
  const statusLabel = buildStatusLabel(data.status, data.statusHistory);
  const milestones = buildMilestones(data.status, data.statusHistory);
  const daysElapsed = computeDaysElapsed(data.statusHistory);

  // Light financials for the KPI strip
  const purchasePrice = data.property?.purchasePrice;
  const propertyValue = data.property?.propertyValue;
  const baseLoan = data.loanTerms?.baseLoanAmount;
  const ltv = (purchasePrice && baseLoan) ? (Number(baseLoan) / Number(purchasePrice)) * 100 : null;

  const subline = [
    data.applicationNumber ? <span key="apn" className="mono">#APP{data.applicationNumber}</span> : null,
    data.loanTerms?.amortizationTermMonths ? `${Math.round(data.loanTerms.amortizationTermMonths / 12)}-yr ${(data.loanTerms.amortizationType || 'Fixed').toLowerCase()}` : null,
    data.closingInformation?.closingDate ? `Est. close ${formatDate(data.closingInformation.closingDate)}` : null,
    findProcessor(data.loanAgents) ? `Processor: ${findProcessor(data.loanAgents)}` : null,
  ].filter(Boolean);

  const handleExportMismo = async () => {
    try {
      const filename = await mortgageService.exportMismo(loanId);
      toast.success(`Downloaded ${filename}`);
    } catch (e) {
      toast.error(`MISMO export failed: ${e.message || e}`);
    }
  };

  return (
    <div className="page dash-page">
      <DashboardHero
        applicationNumber={data.applicationNumber}
        borrowerName={borrowerName}
        status={data.status}
        statusLabel={statusLabel}
        outstandingCount={outstandingCount}
        identifiers={data.identifiers}
        subline={subline.length > 0 ? (
          <span className="dash-subline-row">
            {subline.map((s, i) => (
              <React.Fragment key={i}>{i > 0 && <span className="dash-subline-sep">·</span>}<span>{s}</span></React.Fragment>
            ))}
          </span>
        ) : null}
        onAllLoans={() => navigate('/applications')}
        onExportMismo={handleExportMismo}
        onViewApplication={() => navigate(`/apply?edit=${loanId}&view=1`)}
        onOpenDocuments={() => navigate(`/applications/${loanId}`)}
        onAdvanceStatus={openAdvanceStatus}
      />

      <div className="dash-stat-row">
        <NoteAmountCard
          noteAmount={data.loanTerms?.noteAmount}
          noteRate={data.loanTerms?.noteRatePercent}
          termMonths={data.loanTerms?.amortizationTermMonths}
          amortizationType={data.loanTerms?.amortizationType}
          lienPriority={data.loanTerms?.lienPriorityType}
        />
        <DashboardKpis
          baseLoanAmount={baseLoan}
          purchasePrice={purchasePrice}
          propertyValue={propertyValue}
          ltv={ltv}
        />
      </div>

      <MilestoneTimeline milestones={milestones} daysElapsed={daysElapsed} daysTarget={60} />

      <div className="dashboard-grid">
        {/* ── Workflow cards first — these are the surfaces an LO acts on. ── */}
        <DashCard
          icon={<FaListUl />}
          title="Conditions"
          variant="workflow"
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

        <DashCard icon={<FaStickyNote />} title="Notes" variant="workflow" fullWidth>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Add a note… (Enter to save, Shift+Enter for newline)"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote(); } }}
              style={{ flex: 1, resize: 'vertical' }}
            />
            <button
              className="btn btn-primary"
              onClick={addNote}
              disabled={!newNote.trim()}
              style={{ alignSelf: 'flex-end' }}
            >
              <FaPlus /> Add
            </button>
          </div>
          {data.notes && data.notes.length > 0 ? (
            <ul className="dashboard-conditions">
              {data.notes.map(n => (
                <li key={n.id} className="dashboard-condition">
                  <div className="dashboard-condition-body" style={{ flex: 1 }}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{n.content}</div>
                    <div className="dashboard-condition-meta">
                      {n.authorName && <span>{n.authorName}</span>}
                      <span>{formatDate(n.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-icon btn-icon--danger"
                    onClick={() => removeNote(n)}
                    title="Delete note"
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          ) : <EmptyHint>No notes yet. Add one above.</EmptyHint>}
        </DashCard>

        <DashCard icon={<FaHistory />} title="Status Timeline" variant="workflow" fullWidth>
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

        {/* ── Reference cards — the read-only facts of the loan. ────────── */}
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

        <DashCard icon={<FaCalendarAlt />} title="Key Dates">
          <DefinitionList rows={[
            ['Application received', data.loanTerms?.applicationReceivedDate
              ? formatDate(data.loanTerms.applicationReceivedDate) : null],
            ['Disclosures sent', (() => {
              const h = (data.statusHistory || []).find(s => s.status === 'DISCLOSURES_SENT');
              return h ? formatDate(h.transitionedAt) : null;
            })()],
            ['Disclosures signed', (() => {
              const h = (data.statusHistory || []).find(s => s.status === 'DISCLOSURES_SIGNED');
              return h ? formatDate(h.transitionedAt) : null;
            })()],
            ['Closing date', data.closingInformation?.closingDate
              ? formatDate(data.closingInformation.closingDate) : null],
            ['Funded', (() => {
              const h = (data.statusHistory || []).find(s => s.status === 'FUNDED');
              return h ? formatDate(h.transitionedAt) : null;
            })()],
          ]} />
          <div style={{ borderTop: '1px dotted #e2e6dd', marginTop: '0.4rem', paddingTop: '0.4rem' }}>
            <DefinitionList rows={[
              ['Created', data.createdDate ? formatDate(data.createdDate) : null],
              ['Last updated', data.updatedDate ? formatDate(data.updatedDate) : null],
              ['Days in stage', daysElapsed != null
                ? `${daysElapsed} day${daysElapsed !== 1 ? 's' : ''}` : null],
            ]} />
          </div>
        </DashCard>

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

      </div>

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
      {showAdvanceStatus && (
        <AdvanceStatusModal
          currentStatus={data.status}
          allowedTransitions={allowedTransitions}
          statusOrder={STATUS_ORDER}
          outstandingCount={outstandingCount}
          onClose={() => setShowAdvanceStatus(false)}
          onSave={advanceStatus}
        />
      )}
    </div>
  );
}
