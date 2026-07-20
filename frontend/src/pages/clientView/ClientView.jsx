import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import useRoles from '../../hooks/useRoles';
import mortgageService from '../../services/mortgageService';
import LoanStatusCenter from '../statusCenter/LoanStatusCenter';
import BorrowerDocuments from '../../components/documents/BorrowerDocuments';
import ClientApplicationView from './ClientApplicationView';
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
export default function ClientView() {
  const { loanId } = useParams();
  const { isStaff } = useRoles();
  const [application, setApplication] = useState(null);
  const [tab, setTab] = useState('dashboard');

  useEffect(() => {
    if (!isStaff || !loanId) return undefined;
    let stale = false;
    (async () => {
      const app = await mortgageService.getSuiteApplication(loanId);
      if (!stale) setApplication(app);
    })();
    return () => { stale = true; };
  }, [isStaff, loanId]);

  // Client-view is a staff surface. A borrower has their own /dashboard; send non-staff home.
  if (!isStaff) return <Navigate to="/" replace />;

  const clientName =
    application && application.borrower
      ? [application.borrower.firstName, application.borrower.lastName].filter(Boolean).join(' ')
      : '';

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
