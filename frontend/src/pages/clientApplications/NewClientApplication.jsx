import React, { useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import useRoles from '../../hooks/useRoles';
import mortgageService from '../../services/mortgageService';
import Card from '../../components/design/Card';
import Button from '../../components/design/Button';
import { getClientContext } from '../clientView/clientContext';
import './NewClientApplication.design.css';

/**
 * "Start another loan for the client I'm helping" — the confirm step behind the client-scoped
 * Apply nav.
 *
 * This is a confirm page rather than a bare button for two reasons. First, the server has NO
 * default loan purpose: `POST /api/borrowers/{id}/loans` requires one, so it has to be asked for
 * here. Second, the call is a real write — it creates the loan AND attaches the client as primary
 * borrower in one transaction — so it deserves a deliberate act, not an accidental nav click.
 */

/** The server's LoanPurposeType, exactly — anything else 400s. */
const PURPOSES = [
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'REFINANCE', label: 'Refinance' },
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'OTHER', label: 'Other' },
];

/**
 * The single gate on the write, shared by the handler that performs it.
 *
 * It is a standalone predicate rather than an inline `if` chain because the handler's copy of
 * `isStaff` is captured at render time: with the redirect below early-returning, a non-staff render
 * never produces a button to click, so an inline staff check inside the handler could never be
 * exercised — and an unexercisable guard is one a future edit deletes silently. Here it is pinned
 * directly.
 */
export function canStartApplication({ isStaff, borrowerId, purpose, inFlight }) {
  if (inFlight) return false;            // a second click while the first create is in the air
  return Boolean(isStaff && borrowerId && purpose);
}

export default function NewClientApplication() {
  const { borrowerId } = useParams();
  const { isStaff } = useRoles();
  const navigate = useNavigate();

  // No default: a silently pre-picked purpose is a wrong purpose on the loan record.
  const [purpose, setPurpose] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  // The flag that actually holds the line. `creating` state drives the disabled attribute, but
  // state lags a render behind — a second click inside the same tick sees a still-enabled button.
  // The ref is written synchronously on entry, so the second handler returns before it can POST.
  const inFlight = useRef(false);

  const handleStart = async () => {
    // Read synchronously, before any await: `creating` state lags a render behind, so the ref is
    // the only thing that can stop a second click landing in the same tick.
    if (!canStartApplication({ isStaff, borrowerId, purpose, inFlight: inFlight.current })) return;

    inFlight.current = true;
    setCreating(true);
    setError(null);
    try {
      const created = await mortgageService.createLoanForClient(borrowerId, purpose);
      // A 2xx with an unexpected envelope would navigate to `?loan=undefined` and, because the
      // success path latches the in-flight flag, strand the officer with no way back but a reload.
      if (!created?.loanId) throw new Error('createLoanForClient returned no loanId');
      // Deliberately stays in-flight through the navigation — the loan exists now.
      navigate(`/apply?loan=${created.loanId}`);
    } catch (err) {
      console.error('Failed to create loan for client', err);
      // Re-enable rather than strand: the failure may be transient and the officer is right here.
      inFlight.current = false;
      setCreating(false);
      setError('We couldn’t start the application. Please try again.');
    }
  };

  // The route param is what actually gets written; the stash is only a display convenience, and it
  // CAN disagree. ClientView writes the stash asynchronously (after its fetch resolves), so the
  // nav href that got us here may have been built from the previous client while the stash has
  // since moved on to the next one. Naming the stashed client while posting to the route's client
  // would make this confirm step affirm the opposite of what it does — so the name is trusted only
  // when the two agree.
  const stashed = getClientContext();
  const clientName = (stashed?.borrowerId === borrowerId && stashed.name) || 'this client';

  // Staff surface — a borrower has their own /dashboard. Mirrors ClientApplicationsPage.jsx:169.
  if (!isStaff) return <Navigate to="/" replace />;

  return (
    <div className="page nca-page">
      <Card pad className="nca-card">
        <h1 className="nca-title">{`Start a new application for ${clientName}?`}</h1>
        <p className="nca-sub">
          This creates a new loan and attaches the client to it as the primary borrower. Their
          existing applications stay untouched.
        </p>

        <fieldset className="nca-purposes">
          <legend className="nca-legend">What is this loan for?</legend>
          {PURPOSES.map(({ value, label }) => (
            <label className="nca-purpose" key={value} htmlFor={`purpose-${value}`}>
              <input
                type="radio"
                id={`purpose-${value}`}
                name="loanPurpose"
                value={value}
                checked={purpose === value}
                disabled={creating}
                onChange={() => setPurpose(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>

        {error && <p className="nca-error" role="alert">{error}</p>}

        <div className="nca-actions">
          <Button
            variant="primary"
            onClick={handleStart}
            disabled={creating || !purpose}
          >
            {creating ? 'Starting…' : 'Start application'}
          </Button>
          <Button variant="ghost" to={`/client/${borrowerId}/applications`}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
