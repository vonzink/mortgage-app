import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { suiteLoanUrl } from '../services/suiteWeb';

/**
 * Retired surface: the in-app LO loan dashboard. Loan officers work loans in the
 * suite console now, so `/loan/:loanId` forwards to the console's loan workspace.
 *
 * The route param is already the suite loan id — the pipeline list and the loan
 * typeahead are both fed by the suite (GET /api/me/loans), so ids carried into
 * this route are suite ids. That makes this a straight passthrough; no app-id →
 * suite-uuid resolution is needed. Falls back to the in-app pipeline when the
 * console origin isn't configured (e.g. a borrower-only build).
 */
export default function LoanSuiteRedirect() {
  const { loanId } = useParams();
  const target = suiteLoanUrl(loanId);

  useEffect(() => {
    if (target) window.location.replace(target);
  }, [target]);

  if (!target) return <Navigate to="/applications" replace />;

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }} data-testid="loan-suite-redirect">
      Opening this loan in the console…
    </div>
  );
}
