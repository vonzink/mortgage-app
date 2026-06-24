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
  const auth = useMemo(() => getPasswordlessAuth(), []);
  const [email, setEmail] = useState(payload?.borrower?.email || '');
  const [working, setWorking] = useState(false);

  if (!payload) {
    return (
      <div className="page continue-page">
        <p>This link has expired or is invalid. Please restart your application.</p>
      </div>
    );
  }

  // Fires once the FactorChooser completes any factor (email/SMS OTP or passkey).
  // PRESERVES THE INTAKE TAIL VERBATIM (spec §5.1): createLoanFromIntake +
  // carryOverData + navigate('/apply'). Do not reorder or alter these three lines.
  const finishAndContinue = async () => {
    setWorking(true);
    try {
      await mortgageService.createLoanFromIntake(toIntakeRequest(payload));
      sessionStorage.setItem('carryOverData', JSON.stringify(toCarryOverData(payload)));
      navigate('/apply');
    } catch (e) {
      toast.error('Something went wrong finishing sign-in. Try again.');
      setWorking(false);
      // Rethrow so FactorChooser falls back to the chooser for a retry.
      throw e;
    }
  };

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
