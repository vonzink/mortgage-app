import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Button from '../components/design/Button';
import mortgageService from '../services/mortgageService';
import { decodeHandoffToken } from '../auth/handoffToken';
import { getPasswordlessAuth } from '../auth/passwordless/PasswordlessAuthPort';
import { toIntakeRequest, toCarryOverData } from './continuePrefill';
import './ContinuePage.design.css';

const money = (n) => (typeof n === 'number' ? `$${n.toLocaleString('en-US')}` : '—');

export default function ContinuePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const payload = useMemo(() => decodeHandoffToken(params.get('t')), [params]);
  const auth = useMemo(() => getPasswordlessAuth(), []);
  const [email, setEmail] = useState(payload?.borrower?.email || '');
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState('email');
  const [busy, setBusy] = useState(false);

  if (!payload) {
    return (
      <div className="page continue-page">
        <p>This link has expired or is invalid. Please restart your application.</p>
      </div>
    );
  }

  const sendCode = async () => {
    setBusy(true);
    try {
      await auth.requestCode(email);
      setPhase('code');
    } catch {
      toast.error('Could not send a code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyAndContinue = async () => {
    setBusy(true);
    try {
      const res = await auth.verifyCode(email, code);
      if (!res?.ok) {
        toast.error('That code did not match. Try again.');
        setBusy(false);
        return;
      }
      setPhase('working');
      await mortgageService.createLoanFromIntake(toIntakeRequest(payload));
      sessionStorage.setItem('carryOverData', JSON.stringify(toCarryOverData(payload)));
      navigate('/apply');
    } catch {
      toast.error('Something went wrong finishing sign-in. Try again.');
      setPhase('code');
      setBusy(false);
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

      {phase !== 'working' ? (
        <div className="continue-auth card">
          <label htmlFor="cont-email">Email</label>
          <input
            id="cont-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={phase === 'code'}
          />

          {phase === 'email' ? (
            <Button
              variant="primary"
              onClick={sendCode}
              disabled={busy || !email}
            >
              Email me a 6-digit code
            </Button>
          ) : (
            <>
              <label htmlFor="cont-code">Code</label>
              <input
                id="cont-code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button
                variant="primary"
                onClick={verifyAndContinue}
                disabled={busy || code.length < 4}
              >
                Verify &amp; continue
              </Button>
            </>
          )}

          <p className="muted continue-fine">
            New here? We&apos;ll create your account automatically — no password to remember.
          </p>
        </div>
      ) : (
        <p className="muted">Setting up your application…</p>
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
