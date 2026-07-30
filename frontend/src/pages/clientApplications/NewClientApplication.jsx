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
    if (inFlight.current) return;
    // Same gate as the render below: an effect-free page still shouldn't hand a borrower a write
    // against a borrowerId that isn't theirs.
    if (!isStaff || !borrowerId || !purpose) return;

    inFlight.current = true;
    setCreating(true);
    setError(null);
    try {
      const created = await mortgageService.createLoanForClient(borrowerId, purpose);
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

  const clientName = getClientContext()?.name || 'this client';

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
