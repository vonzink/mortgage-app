import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import mortgageService from '../../services/mortgageService';
import { groupLoans } from './loanGroups';
import LoanSelector, { humanizeStatus } from './sections/LoanSelector';
import './LoanStatusCenter.css';

/**
 * Loan Status Center — the borrower's /dashboard. Container shell: fetches the
 * borrower's loan list (suite /me/loans via getApplications) for the selector,
 * resolves the selected loan (?loan= param → first active → first overall), and
 * fetches the borrower dashboard payload for it. Section components render into
 * the empty grid columns (Tasks 14–17); a null/absent payload section means the
 * LO hid it, so sections render nothing for it.
 */
export default function LoanStatusCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loans, setLoans] = useState(null);   // null = list not loaded yet
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryTick, setRetryTick] = useState(0);

  const fetchLoans = useCallback(async () => {
    try {
      // Suite /me/loans (borrower-scoped server-side), adapted rows:
      // { id, status, statusChangedAt (suite updatedAt), applicationNumber (suite
      // loanNumber), city, state } → selector shape below.
      const page = await mortgageService.getApplications();
      const rows = page?.content ?? [];
      setLoans(rows.map((r) => ({
        id: r.id,
        status: r.status,
        statusChangedAt: r.statusChangedAt,
        loanNumber: r.applicationNumber,
        label: [r.city, r.state].filter(Boolean).join(', ') || null,
      })));
    } catch {
      setLoans(null);
      setError("Couldn't load your loans.");
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  // Selection: ?loan= when it's one of the borrower's loans, else the most
  // recently active loan, else the first loan overall.
  const paramId = searchParams.get('loan');
  const selectedId = useMemo(() => {
    if (!loans || loans.length === 0) return null;
    if (paramId && loans.some((l) => String(l.id) === String(paramId))) return paramId;
    const { active } = groupLoans(loans);
    return active[0]?.id ?? loans[0]?.id ?? null;
  }, [loans, paramId]);

  useEffect(() => {
    if (!selectedId) return undefined;
    let stale = false;
    setLoading(true);
    (async () => {
      // getBorrowerDashboard swallows failures and resolves null.
      const data = await mortgageService.getBorrowerDashboard(selectedId);
      if (stale) return;
      if (data) {
        setPayload(data);
        setError(null);
      } else {
        setError("Couldn't load your loan right now.");
      }
      setLoading(false);
    })();
    return () => { stale = true; };
  }, [selectedId, retryTick]);

  const handleSelect = useCallback((id) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('loan', String(id));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleRetry = useCallback(() => {
    setError(null);
    if (!loans) {
      setLoading(true);
      fetchLoans();
    } else {
      setRetryTick((t) => t + 1);
    }
  }, [loans, fetchLoans]);

  const selectedLoan = loans?.find((l) => String(l.id) === String(selectedId)) || null;
  const prop = payload?.property || null;
  const addressLine = prop
    ? [prop.addressLine1, [prop.city, prop.state].filter(Boolean).join(', ')]
        .filter(Boolean).join(' · ') || null
    : null;

  return (
    <div className="lsc-page">
      {error && (
        <div className="lsc-error-banner" role="alert">
          <span className="lsc-error-msg">{error}</span>
          <button type="button" className="lsc-error-retry" onClick={handleRetry}>
            Retry
          </button>
          <button
            type="button"
            className="lsc-error-dismiss"
            aria-label="Dismiss"
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      <header className="lsc-hero">
        <div className="lsc-hero-text">
          {selectedLoan?.loanNumber && (
            <div className="lsc-eyebrow">Loan #{selectedLoan.loanNumber}</div>
          )}
          <h1>Loan status center</h1>
          {addressLine && <p className="lsc-sub">{addressLine}</p>}
        </div>
        {payload?.status && (
          <span className="lsc-status-pill">{humanizeStatus(payload.status)}</span>
        )}
      </header>

      {loans && loans.length > 1 && (
        <LoanSelector loans={loans} selectedId={selectedId} onSelect={handleSelect} />
      )}

      {loading ? (
        <div className="lsc-skeleton" role="status" aria-label="Loading your loan" />
      ) : (
        <div className="lsc-grid">
          {/* Section components land in Tasks 14–17. */}
          <aside className="lsc-rail-col" />
          <main className="lsc-main-col" />
          <aside className="lsc-side-col" />
        </div>
      )}
    </div>
  );
}
