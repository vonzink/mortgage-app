import React, { useMemo, useState } from 'react';
import Button from '../design/Button';
import { Factor, FACTOR_LABELS, FACTOR_ORDER, isOtpFactor } from '../../auth/passwordless/factors';
import PhoneCollect from './PhoneCollect';
import './FactorChooser.css';

/**
 * FactorChooser — the unified passwordless first-factor picker (spec §5.2).
 *
 * State machine: choose (selector) → (collect-phone?) → start →
 * (enter-code | passkey-ceremony) → done. Adapter-agnostic: takes the active
 * `auth` adapter (Cognito or Dev) and fires `onAuthenticated({ user })` on success.
 *
 * UX (owner request 2026-06-26):
 *  - the factor choice is a RADIO SELECTOR + one "Continue" action (not 3 buttons);
 *  - default = Email OTP (a first-time borrower has no passkey yet);
 *  - a wrong code keeps you ON the code screen to retry (does NOT bounce to the chooser);
 *  - the code screen has "Resend code" and a "Back" control.
 */

// Sub-labels clarify each option — incl. that a passkey must already be set up.
const FACTOR_SUBLABELS = {
  [Factor.PASSKEY]: 'Use a passkey you already set up on this device',
  [Factor.EMAIL_OTP]: 'We email you a one-time code',
  [Factor.SMS_OTP]: 'We text you a one-time code',
};

export default function FactorChooser({ auth, email, onEmailChange, onAuthenticated, onError, onBack, emailAutoComplete = 'email' }) {
  const available = useMemo(() => {
    const list = auth.availableFactors ? auth.availableFactors() : [Factor.EMAIL_OTP];
    const webAuthnOk = typeof window !== 'undefined' && !!window.PublicKeyCredential;
    return FACTOR_ORDER.filter((f) => list.includes(f) && (f !== Factor.PASSKEY || webAuthnOk));
  }, [auth]);

  // Default to Email OTP — the reliable path for a first-time borrower (no passkey enrolled).
  const defaultFactor = available.includes(Factor.EMAIL_OTP) ? Factor.EMAIL_OTP : available[0];
  const [factor, setFactor] = useState(defaultFactor || Factor.EMAIL_OTP);
  const [phase, setPhase] = useState('choose'); // choose | collect-phone | code | working
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [destination, setDestination] = useState(null);
  const [codeError, setCodeError] = useState(''); // inline error on the code screen
  const [note, setNote] = useState(''); // transient "new code sent" note

  const username = email;

  const begin = async (chosen) => {
    if (!username) { onError && onError('Enter your email to continue.'); return; }
    // SMS needs a phone first (only reachable when SMS is live; harmless otherwise).
    if (chosen === Factor.SMS_OTP && !phone) { setFactor(chosen); setPhase('collect-phone'); return; }
    setBusy(true); setCodeError(''); setNote('');
    try {
      const started = await auth.start(username, chosen);
      if (started.kind === 'passkey') {
        // Passkey ceremony already ran inside start() — go straight to respond.
        setPhase('working');
        const res = await auth.respond(started, {});
        await onAuthenticated(res);
        return;
      }
      setState(started);
      setDestination(started.destination || username);
      setCode('');
      setPhase('code');
    } catch (e) {
      onError && onError(otpErrorMessage(e, chosen));
      setPhase('choose');
    } finally {
      setBusy(false);
    }
  };

  // Re-send a fresh OTP for the same factor without leaving the code screen.
  const resend = async () => {
    setBusy(true); setCodeError(''); setNote('');
    try {
      const started = await auth.start(username, (state && state.factor) || factor);
      setState(started);
      setDestination(started.destination || username);
      setCode('');
      setNote('New code sent — check your inbox (and spam).');
    } catch (e) {
      setCodeError(sendCodeErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    setBusy(true); setCodeError(''); setNote('');
    let res;
    try {
      res = await auth.respond(state, { code });
    } catch (e) {
      // Distinguish wrong / expired / rate-limited (Cognito collapses these otherwise).
      // Stay on the code screen so the user can retry or resend.
      setCodeError(codeErrorMessage(e));
      setCode('');
      setBusy(false);
      return;
    }
    // Code verified. Hand off to the caller; if the intake tail fails it rethrows —
    // fall back to the chooser so the user can retry instead of being stranded on
    // "Finishing sign-in…".
    setPhase('working');
    try {
      await onAuthenticated(res);
    } catch (e) {
      setPhase('choose');
      setBusy(false);
    }
  };

  const backToChoose = () => { setCode(''); setCodeError(''); setNote(''); setPhase('choose'); };

  if (phase === 'working') {
    return <p className="muted factor-working">Finishing sign-in…</p>;
  }

  if (phase === 'collect-phone') {
    return (
      <div className="factor-chooser card">
        <button type="button" className="factor-back" onClick={backToChoose} disabled={busy}>← Back</button>
        <PhoneCollect value={phone} onChange={setPhone} />
        <Button variant="primary" disabled={busy || !phone} onClick={() => begin(Factor.SMS_OTP)}>Text me a code</Button>
      </div>
    );
  }

  if (phase === 'code') {
    return (
      <div className="factor-chooser card">
        <button type="button" className="factor-back" onClick={backToChoose} disabled={busy}>← Back</button>
        {destination && <p className="muted factor-dest">We sent a code to <strong>{destination}</strong>.</p>}
        <label htmlFor="factor-code">Enter the code we emailed you</label>
        <input
          id="factor-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          autoFocus
          value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 8)); setCodeError(''); }}
        />
        {codeError && <p className="factor-error" role="alert">{codeError}</p>}
        {note && <p className="factor-note" role="status">{note}</p>}
        <Button variant="primary" disabled={busy || code.length < 6} onClick={submitCode}>Verify &amp; continue</Button>
        <div className="factor-actions">
          <button type="button" className="factor-link" onClick={resend} disabled={busy}>Didn’t get it? Resend code</button>
          <button type="button" className="factor-link" onClick={backToChoose} disabled={busy}>Use a different method</button>
        </div>
      </div>
    );
  }

  // phase === 'choose'
  const single = available.length <= 1;
  return (
    <div className="factor-chooser card">
      {onBack && <button type="button" className="factor-back" onClick={onBack} disabled={busy}>← Back</button>}
      <label htmlFor="factor-email">Email</label>
      <input
        id="factor-email"
        type="email"
        autoComplete={emailAutoComplete}
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
      />

      {!single && (
        <fieldset className="factor-select" disabled={busy}>
          <legend>How would you like to verify it’s you?</legend>
          {available.map((f) => (
            <label key={f} className={`factor-radio${f === factor ? ' is-selected' : ''}`}>
              <input type="radio" name="factor" value={f} checked={f === factor} onChange={() => setFactor(f)} />
              <span className="factor-radio-text">
                <span className="factor-radio-title">{FACTOR_LABELS[f]}</span>
                {FACTOR_SUBLABELS[f] && <span className="factor-radio-sub">{FACTOR_SUBLABELS[f]}</span>}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <Button variant="primary" disabled={busy || !email} onClick={() => begin(factor)}>
        {single && isOtpFactor(factor) ? FACTOR_LABELS[factor] : 'Continue'}
      </Button>

      <p className="muted factor-fine">No password to remember — we’ll verify it’s you in one step.</p>
    </div>
  );
}

function otpErrorMessage(e, factor) {
  if (factor === Factor.PASSKEY) {
    return 'Could not use a passkey — set one up first (in your account settings), or choose Email instead.';
  }
  return 'Could not send a code. Check your email address and try again.';
}

/**
 * Map a code-VERIFY failure (Cognito RespondToAuthChallenge, managed EMAIL_OTP) to a
 * specific, actionable message. Cognito surfaces distinct exceptions we were collapsing
 * into one misleading "didn't match": an expired code, a dead session, and a rate limit
 * each need a different next step. Keyed off the AWS SDK v3 error `name`.
 */
export function codeErrorMessage(e) {
  const name = e?.name || '';
  const msg = (e?.message || '').toLowerCase();
  switch (name) {
    case 'CodeMismatchException':
      return 'That code doesn’t match. Double-check the digits and try again.';
    case 'ExpiredCodeException':
      return 'That code has expired. Tap “Resend code” to get a fresh one.';
    case 'TooManyFailedAttemptsException':
      return 'Too many incorrect codes. Tap “Resend code” to start over.';
    case 'LimitExceededException':
    case 'TooManyRequestsException':
      return 'Too many attempts. Wait about a minute, then tap “Resend code”.';
    case 'NotAuthorizedException':
      // An expired/used code or a dead session both land here; a resend restarts cleanly.
      return msg.includes('expired')
        ? 'That code has expired. Tap “Resend code” to get a fresh one.'
        : 'This code has expired or was already used. Tap “Resend code” for a new one.';
    default:
      return 'We couldn’t verify that code. Tap “Resend code” and enter the newest one.';
  }
}

/** Map a code-SEND failure (resend / start) — call out rate limits explicitly. */
export function sendCodeErrorMessage(e) {
  const name = e?.name || '';
  if (name === 'LimitExceededException' || name === 'TooManyRequestsException') {
    return 'You’ve requested too many codes. Wait about a minute, then try again.';
  }
  return 'Couldn’t send a new code. Try again in a moment.';
}
