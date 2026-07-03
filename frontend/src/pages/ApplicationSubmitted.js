import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import mortgageService from '../services/mortgageService';
import Button from '../components/design/Button';
import Icon from '../components/design/Icon';
import { Card } from '../components/design/Card';

/**
 * Borrower confirmation page — where a client lands right after submitting their
 * application (walkthrough finding: they used to be dropped on the applications list
 * with no guidance). Says thank you, shows the application number, explains what
 * happens next, lists the documents to gather, and links to status + uploads.
 */

const NEXT_STEPS = [
  { title: 'We review your application', body: 'Your loan officer looks everything over and reaches out if anything needs clarifying — usually within one business day.' },
  { title: 'You upload your documents', body: 'Gather the items below and upload them to your loan — the sooner we have them, the faster things move.' },
  { title: 'Underwriting', body: 'We verify your income, assets, and the property, and issue your loan decision.' },
  { title: 'Clear to close', body: 'We schedule your closing, you sign, and you get your keys.' },
];

const STARTER_DOCS = [
  'Government-issued photo ID',
  'Last 2 pay stubs',
  'Last 2 bank statements (all pages)',
  'Last 2 years of W-2s or tax returns',
];

const ApplicationSubmitted = () => {
  const location = useLocation();
  const suiteLoanId = location.state?.suiteLoanId ?? null;
  const [loanNumber, setLoanNumber] = useState(null);

  useEffect(() => {
    if (!suiteLoanId) return;
    let stale = false;
    (async () => {
      try {
        // /me/loans is borrower-scoped — find this loan for its human-friendly number.
        const page = await mortgageService.getApplications();
        const mine = (page?.content ?? page?.items ?? []).find(
          (l) => String(l.id) === String(suiteLoanId),
        );
        if (!stale && mine?.loanNumber) setLoanNumber(mine.loanNumber);
      } catch {
        /* the confirmation page never blocks on a lookup */
      }
    })();
    return () => { stale = true; };
  }, [suiteLoanId]);

  const statusHref = suiteLoanId ? `/dashboard?loan=${suiteLoanId}` : '/applications';

  return (
    <div className="page" data-testid="application-submitted">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '24px 16px 8px' }}>
            <Icon name="check" size={40} />
            <h1 style={{ margin: '12px 0 4px' }}>Thank you — your application is in!</h1>
            {loanNumber && (
              <p className="muted" data-testid="application-number">
                Application #{loanNumber}
              </p>
            )}
            <p className="muted">
              Your loan officer will be in touch shortly. Here's what happens next.
            </p>
          </div>

          <div style={{ padding: '8px 24px' }}>
            <ol style={{ paddingLeft: 20, display: 'grid', gap: 10 }}>
              {NEXT_STEPS.map((s) => (
                <li key={s.title}>
                  <strong>{s.title}.</strong>{' '}
                  <span className="muted">{s.body}</span>
                </li>
              ))}
            </ol>
          </div>

          <div style={{ padding: '8px 24px' }}>
            <h3 style={{ marginBottom: 6 }}>Documents to gather</h3>
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 4 }}>
              {STARTER_DOCS.map((d) => (
                <li key={d} className="muted">{d}</li>
              ))}
            </ul>
            <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              Depending on your situation we may ask for a few more — your loan page always
              shows the latest list.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', padding: '16px 24px 24px', flexWrap: 'wrap' }}>
            <Button variant="primary" to={statusHref} data-testid="upload-documents-cta">
              Upload documents
            </Button>
            <Button variant="ghost" to={statusHref}>
              View application status
            </Button>
          </div>

          <p className="muted" style={{ textAlign: 'center', paddingBottom: 20, fontSize: 13 }}>
            You can come back anytime — sign in and open <Link to="/applications">My applications</Link> to
            check your status, calendar, and documents.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default ApplicationSubmitted;
