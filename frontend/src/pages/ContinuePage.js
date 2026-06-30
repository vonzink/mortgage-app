import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import mortgageService from '../services/mortgageService';
import { decodeHandoffToken } from '../auth/handoffToken';
import { getPasswordlessAuth } from '../auth/passwordless/PasswordlessAuthPort';
import FactorChooser from '../components/auth/FactorChooser';
import { toIntakeRequest, toCarryOverData } from './continuePrefill';
import './ContinuePage.design.css';

const money = (n) => (typeof n === 'number' ? `$${n.toLocaleString('en-US')}` : '—');

export default function ContinuePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const payload = useMemo(() => decodeHandoffToken(params.get('t')), [params]);
  // Co-borrower invite entry: the funnel is also reached via the emailed invite link
  // (app.msfgco.com/continue#invite=<token>&loan=<loanId>). There is NO handoff `t` then — the
  // co-borrower authenticates (OTP to the invited email) and then accepts the invite, which binds
  // their Cognito sub to the co-borrower party. Both values live in the URL FRAGMENT (not the query,
  // so the token isn't sent in Referer / server logs).
  const invite = useMemo(() => {
    const h = typeof window !== 'undefined' ? window.location.hash : '';
    if (!h || h.length < 2) return null;
    const p = new URLSearchParams(h.slice(1));
    const token = p.get('invite');
    const loanId = p.get('loan');
    return token && loanId ? { token, loanId } : null;
  }, []);
  const auth = useMemo(() => getPasswordlessAuth(), []);
  const [email, setEmail] = useState(payload?.borrower?.email || '');
  const [working, setWorking] = useState(false);

  if (!payload && !invite) {
    return (
      <div className="page continue-page">
        <p>This link has expired or is invalid. Please restart your application.</p>
      </div>
    );
  }

  // Fires once the FactorChooser completes any factor (email/SMS OTP or passkey).
  // Intake tail (spec §5.1): createLoanFromIntake → carryOverData → go to /apply.
  // The final hop MUST be a hard navigation on the real-Cognito path: mintSession's
  // storeUser writes sessionStorage but does NOT raise react-oidc-context's userLoaded
  // event, so a SPA navigate() would leave isAuthenticated=false and RequireAuth would
  // bounce the just-authenticated borrower to the hosted UI. window.location.assign forces
  // the AuthProvider to re-init and read the freshly-written user. (carryOverData lives in
  // sessionStorage, so it survives the reload.) Dev bypass keeps the SPA navigate.
  const finishAndContinue = async () => {
    setWorking(true);
    try {
      // createLoanFromIntake unwraps the suite ApiResponse envelope → the intake
      // result object ({ loanId, loanNumber }). Capture the loan id so /apply knows
      // which SoR loan to SAVE the full application into (borrower self-submit path).
      // Be robust to either field name (loanId is the contract; id is a fallback).
      const intakeResult = await mortgageService.createLoanFromIntake(toIntakeRequest(payload));
      const suiteLoanId = intakeResult?.loanId ?? intakeResult?.id ?? null;
      if (suiteLoanId) {
        sessionStorage.setItem('suiteLoanId', String(suiteLoanId));
      }
      sessionStorage.setItem('carryOverData', JSON.stringify(toCarryOverData(payload)));
      if (process.env.REACT_APP_DEV_SUB) {
        navigate('/apply');
      } else {
        window.location.assign('/apply');
      }
    } catch (e) {
      toast.error('Something went wrong finishing sign-in. Try again.');
      setWorking(false);
      // Rethrow so FactorChooser falls back to the chooser for a retry.
      throw e;
    }
  };

  // Co-borrower invite tail: bind the invitee to their co-borrower party (accept-invite), set the
  // suite loan id so /apply loads THIS loan, then hard-navigate (same mintSession rationale as the
  // primary path). No intake/createLoanFromIntake — the loan already exists.
  const finishCoBorrowerInvite = async () => {
    setWorking(true);
    try {
      await mortgageService.acceptCoBorrowerInvite(invite.loanId, invite.token);
      sessionStorage.setItem('suiteLoanId', String(invite.loanId));
      if (process.env.REACT_APP_DEV_SUB) {
        navigate('/apply');
      } else {
        window.location.assign('/apply');
      }
    } catch (e) {
      toast.error("We couldn't accept your invite. Make sure you signed in with the email it was sent to.");
      setWorking(false);
      throw e;
    }
  };

  // ── Co-borrower invite flow (no handoff payload — they came from the emailed invite link) ──────
  if (invite && !payload) {
    return (
      <div className="page continue-page">
        <h1 className="continue-h1">You&apos;ve been invited</h1>
        <p className="muted">
          You&apos;ve been added as a co-borrower on a mortgage application. Sign in with the email
          your invitation was sent to, and we&apos;ll take you to your part of the application.
        </p>
        {working ? (
          <p className="muted">Finishing sign-in…</p>
        ) : (
          <FactorChooser
            auth={auth}
            email={email}
            onEmailChange={setEmail}
            onAuthenticated={finishCoBorrowerInvite}
            onError={(msg) => toast.error(msg)}
            onBack={() => window.history.back()}
            emailAutoComplete="off"
          />
        )}
      </div>
    );
  }

  const first = payload.borrower?.firstName || 'there';

  return (
    <div className="page continue-page">
      <h1 className="continue-h1">Welcome, {first}</h1>
      {payload.loanOfficer?.name && (
        <p className="muted">
          Let&apos;s pick up where you left off — you&apos;ll be working with {payload.loanOfficer.name}.
        </p>
      )}

      <div className="continue-summary card">
        <Row label="Loan purpose" value={payload.loanPurpose} />
        <Row label="Purchase price" value={money(payload.display?.purchasePrice)} />
        {payload.display?.downPaymentPercent && (
          <Row label="Down payment" value={payload.display.downPaymentPercent} />
        )}
        {payload.property?.propertyUse && (
          <Row label="Property" value={payload.property.propertyUse} />
        )}
      </div>

      {working ? (
        <p className="muted">Setting up your application…</p>
      ) : (
        <>
          <FactorChooser
            auth={auth}
            email={email}
            onEmailChange={setEmail}
            onAuthenticated={finishAndContinue}
            onError={(msg) => toast.error(msg)}
            onBack={() => window.history.back()}
            emailAutoComplete="off"
          />
          <p className="muted continue-fine">
            New here? We&apos;ll create your account automatically — no password to remember.
          </p>
        </>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="continue-row">
      <span className="muted">{label}</span>
      <span className="continue-val">{value || '—'}</span>
    </div>
  );
}
