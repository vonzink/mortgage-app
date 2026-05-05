import React, { useCallback, useEffect, useState } from 'react';
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
} from 'react-icons/fa';

import dashboardService from '../services/dashboardService';
import './loanDashboard.css';

/**
 * Loan Dashboard — the LO's working view of a single loan in flight.
 *
 * Distinct from the application form (URLA): the URLA is borrower-filled,
 * the dashboard is LO-side. Phase 1 surface is read-only — populates from
 * MISMO imports + manual application data; edit-in-place comes when the
 * dashboard grows past a viewer.
 */
export default function LoanDashboardPage() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) {
    return <div className="card" style={{ padding: '2rem' }}>Loading dashboard…</div>;
  }
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
            <span className={`status-pill status-${(data.status || 'unknown').toLowerCase()}`}>
              {data.status || 'UNKNOWN'}
            </span>
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
        <DashCard icon={<FaFileSignature />} title="Loan Terms">
          {data.loanTerms ? (
            <DefinitionList rows={[
              ['Note rate', formatRate(data.loanTerms.noteRatePercent)],
              ['Note amount', formatMoney(data.loanTerms.noteAmount)],
              ['Base loan amount', formatMoney(data.loanTerms.baseLoanAmount)],
              ['Amortization', data.loanTerms.amortizationType],
              ['Term', data.loanTerms.amortizationTermMonths
                ? `${data.loanTerms.amortizationTermMonths} months`
                : null],
              ['Lien priority', data.loanTerms.lienPriorityType],
              ['Application received', data.loanTerms.applicationReceivedDate],
            ]} />
          ) : (
            <EmptyHint>Import a MISMO file or edit terms to populate this section.</EmptyHint>
          )}
        </DashCard>

        <DashCard icon={<FaHome />} title="Subject Property">
          {data.property ? (
            <DefinitionList rows={[
              ['Address', [
                data.property.addressLine,
                [data.property.city, data.property.state, data.property.zipCode]
                  .filter(Boolean).join(', '),
                data.property.county ? `${data.property.county} County` : null,
              ].filter(Boolean).join(' · ')],
              ['Property type', data.property.propertyType],
              ['Construction', data.property.constructionType],
              ['Year built', data.property.yearBuilt],
              ['Units', data.property.unitsCount],
              ['Estimated value', formatMoney(data.property.propertyValue)],
            ]} />
          ) : (
            <EmptyHint>No property on file.</EmptyHint>
          )}
        </DashCard>

        <DashCard icon={<FaUser />} title="Primary Borrower">
          {data.primaryBorrower ? (
            <DefinitionList rows={[
              ['Name', borrowerName || null],
              ['Email', data.primaryBorrower.email],
              ['Phone', data.primaryBorrower.phone],
            ]} />
          ) : (
            <EmptyHint>No borrower yet.</EmptyHint>
          )}
        </DashCard>

        <DashCard icon={<FaIdBadge />} title="Loan Identifiers">
          {hasAnyIdentifier(data.identifiers) ? (
            <DefinitionList rows={[
              ['LendingPad', data.identifiers.lendingpadLoanNumber],
              ['Investor', data.identifiers.investorLoanNumber],
              ['MERS MIN', data.identifiers.mersMin],
            ]} />
          ) : (
            <EmptyHint>No external identifiers yet.</EmptyHint>
          )}
        </DashCard>

        <DashCard
          icon={<FaCalendarAlt />}
          title="Proposed Housing Expenses"
          fullWidth
        >
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
                    <td>{prettyExpenseType(he.expenseType)}</td>
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
          ) : (
            <EmptyHint>No housing expenses imported. They'll populate from a URLA MISMO import.</EmptyHint>
          )}
        </DashCard>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function DashCard({ icon, title, children, fullWidth }) {
  return (
    <div className={`card dashboard-card${fullWidth ? ' dashboard-card--wide' : ''}`}>
      <h2 className="dashboard-card-title">{icon} {title}</h2>
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
  // 4 decimals from backend; trim trailing zeros for display
  return `${n.toFixed(4).replace(/\.?0+$/, '')}%`;
}

function hasAnyIdentifier(ids) {
  return ids && (ids.lendingpadLoanNumber || ids.investorLoanNumber || ids.mersMin);
}

function sumExpenses(list) {
  return list.reduce((acc, h) => acc + (Number(h.paymentAmount) || 0), 0);
}

/** Insert spaces into MISMO PascalCase enum values. e.g. "FirstMortgagePrincipalAndInterest" → "First Mortgage Principal And Interest" */
function prettyExpenseType(s) {
  if (!s) return '—';
  return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
}
