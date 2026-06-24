import React, { useMemo, useState } from 'react';
import Button from '../design/Button';
import { Factor, FACTOR_LABELS, FACTOR_ORDER, isOtpFactor } from '../../auth/passwordless/factors';
import PhoneCollect from './PhoneCollect';
import './FactorChooser.css';

/**
 * FactorChooser — the unified passwordless first-factor picker (spec §5.2).
 *
 * Drives the state machine: choose-factor → (collect-phone?) → start →
 * (enter-code | passkey-ceremony) → done. Adapter-agnostic: it takes the active
 * `auth` adapter (Cognito or Dev) and an `onAuthenticated({ user })` callback fired
 * once `respond()` succeeds. Hosting pages (SignInPage / ContinuePage) own what
 * happens next (navigate, run intake, …).
 *
 * Factor ordering = Passkey > Email OTP > SMS OTP (spec §2.2). SMS only appears if
 * `auth.availableFactors()` includes it (it does NOT today — §3.3 deferred). Passkey
 * only when WebAuthn is supported (the adapter already filters, plus a belt-and-braces
 * window.PublicKeyCredential check here).
 */
export default function FactorChooser({ auth, email, onEmailChange, onAuthenticated, onError }) {
  const available = useMemo(() => {
    const list = auth.availableFactors ? auth.availableFactors() : [Factor.EMAIL_OTP];
    const webAuthnOk = typeof window !== 'undefined' && !!window.PublicKeyCredential;
    return FACTOR_ORDER.filter(
      (f) => list.includes(f) && (f !== Factor.PASSKEY || webAuthnOk)
    );
  }, [auth]);

  // Default to the most-preferred available factor.
  const [factor, setFactor] = useState(available[0] || Factor.EMAIL_OTP);
  const [phase, setPhase] = useState('choose'); // choose | collect-phone | code | working
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [destination, setDestination] = useState(null);

  const fail = (msg) => {
    if (onError) onError(msg);
  };

  // username for OTP/passkey = the entered email (headless apps collect it first, §3.4).
  const username = email;

  const begin = async (chosen) => {
    if (!username) {
      fail('Enter your email to continue.');
      return;
    }
    // SMS needs a phone first (only reachable when SMS is live; harmless otherwise).
    if (chosen === Factor.SMS_OTP && !phone) {
      setFactor(chosen);
      setPhase('collect-phone');
      return;
    }
    setBusy(true);
    try {
      const started = await auth.start(username, chosen);
      if (started.kind === 'passkey') {
        // Passkey ceremony already ran inside start() — go straight to respond.
        setPhase('working');
        const res = await auth.respond(started, {});
        // If the parent's post-auth work (e.g. intake) throws, fall back to the
        // chooser so the user can retry.
        await onAuthenticated(res);
        return;
      }
      // OTP: code sent, show the code entry.
      setState(started);
      setDestination(started.destination || username);
      setPhase('code');
    } catch (e) {
      fail(otpErrorMessage(e, chosen));
      setPhase('choose');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    setBusy(true);
    try {
      const res = await auth.respond(state, { code });
      setPhase('working');
      // Await so a failure in the parent's post-auth work resets us to the chooser.
      await onAuthenticated(res);
    } catch (e) {
      fail('That code did not match. Try again.');
      setPhase('choose');
      setBusy(false);
    }
  };

  if (phase === 'working') {
    return <p className="muted factor-working">Finishing sign-in…</p>;
  }

  if (phase === 'collect-phone') {
    return (
      <div className="factor-chooser card">
        <PhoneCollect value={phone} onChange={setPhone} />
        <Button
          variant="primary"
          disabled={busy || !phone}
          onClick={() => begin(Factor.SMS_OTP)}
        >
          Text me a code
        </Button>
        <button type="button" className="factor-link" onClick={() => setPhase('choose')}>
          Use a different method
        </button>
      </div>
    );
  }

  if (phase === 'code') {
    return (
      <div className="factor-chooser card">
        {destination && (
          <p className="muted factor-dest">We sent a code to {destination}.</p>
        )}
        <label htmlFor="factor-code">Enter the 6-digit code</label>
        <input
          id="factor-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
        <Button variant="primary" disabled={busy || code.length < 6} onClick={submitCode}>
          Verify &amp; continue
        </Button>
        <button
          type="button"
          className="factor-link"
          onClick={() => {
            setCode('');
            setPhase('choose');
          }}
        >
          Use a different method
        </button>
      </div>
    );
  }

  // phase === 'choose'
  return (
    <div className="factor-chooser card">
      <label htmlFor="factor-email">Email</label>
      <input
        id="factor-email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
      />

      {/* Only show the factor toggle when there is an actual choice to make. */}
      {available.length > 1 && (
        <div className="factor-options" role="group" aria-label="Choose how to sign in">
          {available.map((f) => (
            <button
              key={f}
              type="button"
              className={`factor-option${f === factor ? ' is-selected' : ''}`}
              aria-pressed={f === factor}
              onClick={() => setFactor(f)}
            >
              {FACTOR_LABELS[f]}
            </button>
          ))}
        </div>
      )}

      <Button
        variant="primary"
        disabled={busy || !email}
        onClick={() => begin(factor)}
      >
        {factor === Factor.PASSKEY
          ? 'Use my passkey'
          : isOtpFactor(factor)
          ? FACTOR_LABELS[factor]
          : 'Continue'}
      </Button>

      <p className="muted factor-fine">
        No password to remember — we&apos;ll verify it&apos;s you in one step.
      </p>
    </div>
  );
}

function otpErrorMessage(e, factor) {
  if (factor === Factor.PASSKEY) {
    return 'Could not use your passkey. Try another method.';
  }
  return 'Could not send a code. Check your email and try again.';
}
