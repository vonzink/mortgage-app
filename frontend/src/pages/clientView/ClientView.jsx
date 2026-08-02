import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import useRoles from '../../hooks/useRoles';
import mortgageService from '../../services/mortgageService';
import LoanStatusCenter from '../statusCenter/LoanStatusCenter';
import BorrowerDocuments from '../../components/documents/BorrowerDocuments';
import ClientApplicationView from './ClientApplicationView';
import { setClientContext } from './clientContext';
import './ClientView.css';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'application', label: 'Application' },
  { key: 'documents', label: 'Documents' },
];

/**
 * Staff-only "see it as the client sees it" shell for a single suite loan. The LO lands here from
 * the console's "Open in borrower app". Read-only application + live dashboard + interactive
 * documents. Every call uses the LO's own staff token against borrower endpoints that already admit
 * staff (targeting the primary borrower); edits are attributed to the LO, never spoofed as the client.
 */
// Shared by the effect (to seed the client context) and the banner render (to display it), so the
// nav and the banner can never disagree about the client's name.
function buildClientName(borrower) {
  return borrower ? [borrower.firstName, borrower.lastName].filter(Boolean).join(' ') : '';
}

export default function ClientView() {
  const { loanId } = useParams();
  const { isStaff } = useRoles();
  const [searchParams] = useSearchParams();
  const [application, setApplication] = useState(null);
  // `?tab=` makes each tab deep-linkable, so "open this client's application" can land on the
  // application itself rather than the dashboard the reader then has to click past. Validated
  // against TABS: an unknown or absent value falls back to dashboard rather than rendering a
  // blank shell, so a stale or hand-edited link degrades to the normal landing.
  const requestedTab = searchParams.get('tab');
  const [tab, setTab] = useState(
    TABS.some((t) => t.key === requestedTab) ? requestedTab : 'dashboard',
  );

  useEffect(() => {
    if (!isStaff || !loanId) return undefined;
    let stale = false;
    (async () => {
      const app = await mortgageService.getSuiteApplication(loanId);
      if (stale) return;
      setApplication(app);
      // Seed "the client I'm helping" so the TopBar's Applications/Apply become client-scoped.
      // borrowerId comes straight off the suite payload (BorrowerApplicationResponse.borrowerId).
      if (app?.borrowerId) {
        setClientContext({
          borrowerId: app.borrowerId,
          loanId,
          name: buildClientName(app.borrower),
        });
      }
    })();
    return () => { stale = true; };
  }, [isStaff, loanId]);

  // Client-view is a staff surface. A borrower has their own /dashboard; send non-staff home.
  if (!isStaff) return <Navigate to="/" replace />;

  const clientName = buildClientName(application?.borrower);

  return (
    <div className="client-view">
      <div className="client-view-banner" role="status">
        <div className="cv-banner-main">
          <span className="cv-banner-eyebrow">Client view</span>
          <span className="cv-banner-name">{clientName || 'Loading…'}</span>
          {application?.loanNumber && <span className="cv-banner-loan">Loan #{application.loanNumber}</span>}
        </div>
        <p className="cv-banner-sub">
          You are viewing this loan as the client sees it. Changes save under your name — use
          Fill out application on the Application tab to edit with the client.
        </p>
      </div>

      <div className="client-view-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`cv-tab${tab === t.key ? ' cv-tab-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="client-view-body">
        {tab === 'dashboard' && <LoanStatusCenter loanId={loanId} />}
        {tab === 'application' && <ClientApplicationView application={application} loanId={loanId} />}
        {tab === 'documents' && <BorrowerDocuments suiteLoanId={loanId} />}
      </div>
    </div>
  );
}
