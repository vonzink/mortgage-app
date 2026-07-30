import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import useRoles from '../../hooks/useRoles';
import mortgageService from '../../services/mortgageService';
import Card from '../../components/design/Card';
import Button from '../../components/design/Button';
import Pill from '../../components/design/Pill';
import Icon from '../../components/design/Icon';
import { getClientContext } from '../clientView/clientContext';
import './ClientApplicationsPage.design.css';

/**
 * "Every application this client has with us" — the staff-side loan history for one borrower,
 * reached from the client-scoped Applications nav instead of bouncing back to the suite console.
 *
 * The point of the page is the RESTRICTED list: loans matched to this client that belong to a
 * DIFFERENT loan officer. Two officers unknowingly working the same client is exactly the collision
 * this surface exists to reveal, so those loans are shown — but the server 403s any attempt to open
 * one, so they carry NO control and NO link at all. A disabled-looking link that still navigated
 * would just hand the officer a 403; absence is the honest affordance.
 *
 * Row order is the server's (active before terminal, most-recently-updated first) and is never
 * re-sorted here.
 */

/** 24×24 lock, matching the design-system icon geometry. Local because the shared Icon set has none. */
function LockIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 018 0v3" />
    </svg>
  );
}

function statusTone(status) {
  if (!status) return 'muted';
  if (status === 'FUNDED' || status === 'CTC' || status === 'DOCS_OUT') return 'active';
  if (status === 'DISPOSITIONED' || status === 'WITHDRAWN' || status === 'DENIED') return 'danger';
  if (status === 'REGISTERED' || status === 'APPLICATION') return 'muted';
  return 'review';
}

function cityState(row) {
  return [row.propertyCity, row.propertyState].filter(Boolean).join(', ');
}

function formatUpdated(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

/** Shared identity block — loan number, property, status, and match provenance. */
function RowIdentity({ row }) {
  const place = cityState(row);
  return (
    <div className="cl-row-main">
      <div className="cl-row-head">
        <span className="cl-loan-number">{`#${row.loanNumber || '—'}`}</span>
        {row.primaryBorrowerName && <span className="cl-borrower">{row.primaryBorrowerName}</span>}
        <Pill tone={statusTone(row.status)} dot>{row.status || '—'}</Pill>
        {/* Provenance, not a warning: when the client has no portal account EVERY row is
            email-matched, including the loan the officer arrived from. */}
        {row.matchedOn === 'email' && (
          <span className="cl-match-badge" title="Matched to this client by email address, not a linked portal account">
            Matched by email
          </span>
        )}
      </div>
      <div className="cl-row-sub">{place || 'No property address'}</div>
    </div>
  );
}

function AccessibleRow({ row }) {
  const navigate = useNavigate();
  const updated = formatUpdated(row.updatedAt);

  return (
    <Card pad className="cl-row" data-testid={`client-loan-${row.loanId}`}>
      <RowIdentity row={row} />
      <div className="cl-row-meta">
        {row.loanOfficerName && <div className="cl-meta-line">{`Loan officer: ${row.loanOfficerName}`}</div>}
        {updated && <div className="cl-meta-line cl-meta-dim">{`Updated ${updated}`}</div>}
      </div>
      <div className="cl-row-actions">
        <Button variant="primary" size="sm" onClick={() => navigate(`/apply?loan=${row.loanId}`)}>
          <Icon name="edit" size={14} /> Open application
        </Button>
        <Button variant="ghost" size="sm" to={`/client-view/${row.loanId}`}>
          View dashboard
        </Button>
      </div>
    </Card>
  );
}

function RestrictedRow({ row }) {
  return (
    <Card pad className="cl-row cl-row--restricted" data-testid={`client-loan-${row.loanId}`}>
      <RowIdentity row={row} />
      <div className="cl-row-meta">
        <div className="cl-meta-line">
          {`Loan officer: ${row.loanOfficerName || 'Unassigned'}`}
          {/* A departed officer is still who the loan belongs to — mark them, never anonymize them. */}
          {row.loanOfficerInactive && <span className="cl-inactive"> (inactive)</span>}
        </div>
        <div className="cl-meta-line cl-meta-dim">Access: Restricted</div>
      </div>
      {/* Deliberately no control and no link — this loan 403s server-side. */}
      <div className="cl-row-actions cl-row-actions--locked">
        <span className="cl-locked">
          <LockIcon />
          <span>This loan is assigned to another loan officer.</span>
        </span>
      </div>
    </Card>
  );
}

export default function ClientApplicationsPage() {
  const { borrowerId } = useParams();
  const { isStaff } = useRoles();
  const [state, setState] = useState({ status: 'loading', data: null });

  // The staff gate lives HERE, not only in the render below: the early return sits after the hooks
  // (rules of hooks), so the effect would still fire for a borrower and leak a fetch for a
  // borrowerId that isn't theirs. The server 403s it, but we should never ask.
  const load = useCallback(async () => {
    if (!borrowerId || !isStaff) return;
    setState({ status: 'loading', data: null });
    try {
      const data = await mortgageService.getClientLoans(borrowerId);
      setState({ status: 'ready', data });
    } catch (err) {
      console.error('Failed to load client applications', err);
      setState({ status: 'error', data: null });
    }
  }, [borrowerId, isStaff]);

  useEffect(() => { load(); }, [load]);

  const accessible = state.data?.accessible || [];
  const restricted = state.data?.restricted || [];
  const shown = accessible.length + restricted.length;
  const totalMatched = state.data?.totalMatched ?? shown;
  // A silently truncated list would read as "no collision" when there is one. Say so out loud.
  const truncated = totalMatched > shown;
  // The context stash is absent on a deep link or a refresh; fall back to the rows themselves so a
  // bookmarked page still says whose loans these are.
  const clientName = getClientContext()?.name
    || accessible[0]?.primaryBorrowerName
    || restricted[0]?.primaryBorrowerName;

  // Staff surface — a borrower has their own /dashboard. Mirrors ClientView.jsx:56.
  if (!isStaff) return <Navigate to="/" replace />;

  return (
    <div className="page cl-page">
      <div className="cl-page-header">
        <div>
          <h1 className="cl-page-title">Applications</h1>
          {clientName && <p className="cl-page-sub">{`All loans on file for ${clientName}.`}</p>}
        </div>
      </div>

      {state.status === 'loading' && (
        <Card pad><div className="cl-state">Loading applications…</div></Card>
      )}

      {state.status === 'error' && (
        <Card pad>
          <div className="cl-state cl-state--error">
            <p className="cl-state-title">We couldn&rsquo;t load this client&rsquo;s applications.</p>
            <Button size="sm" onClick={load}>Try again</Button>
          </div>
        </Card>
      )}

      {state.status === 'ready' && shown === 0 && (
        <Card pad>
          <div className="cl-state">
            <p className="cl-state-title">No applications yet</p>
            <p className="cl-state-sub">This client doesn&rsquo;t have any loans on file.</p>
          </div>
        </Card>
      )}

      {state.status === 'ready' && shown > 0 && (
        <>
          {truncated && (
            <p className="cl-truncation" role="status">
              {`Showing ${shown} of ${totalMatched} matches.`}
            </p>
          )}
          <div className="cl-rows">
            {accessible.map((row) => <AccessibleRow key={row.loanId} row={row} />)}
            {restricted.map((row) => <RestrictedRow key={row.loanId} row={row} />)}
          </div>
        </>
      )}
    </div>
  );
}
