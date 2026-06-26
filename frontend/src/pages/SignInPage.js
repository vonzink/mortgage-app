import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import FactorChooser from '../components/auth/FactorChooser';
import { getPasswordlessAuth } from '../auth/passwordless/PasswordlessAuthPort';
import './ContinuePage.design.css';

/**
 * SignInPage (spec §5.2) — first-class passwordless login that REPLACES the
 * Cognito Hosted-UI redirect for both borrowers and staff (unified for all personas).
 * Same FactorChooser as ContinuePage, minus the funnel-summary card + intake call.
 * On success → navigate to `returnTo` (if a 401 bounced us here) or `/applications`.
 */
export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useMemo(() => getPasswordlessAuth(), []);
  const [email, setEmail] = useState('');

  const returnTo = location.state?.returnTo || '/applications';

  // Hard navigation on the real-Cognito path so react-oidc-context's AuthProvider
  // re-initializes and adopts the session mintSession just wrote (storeUser persists
  // storage but does not raise userLoaded → a SPA navigate keeps isAuthenticated=false
  // → RequireAuth bounces to the hosted UI). Dev bypass keeps the SPA navigate.
  const onAuthenticated = () => {
    if (process.env.REACT_APP_DEV_SUB) {
      navigate(returnTo, { replace: true });
    } else {
      window.location.assign(returnTo);
    }
  };

  return (
    <div className="page continue-page">
      <h1 className="continue-h1">Sign in</h1>
      <p className="muted">No password needed — choose how you&apos;d like to verify it&apos;s you.</p>

      <FactorChooser
        auth={auth}
        email={email}
        onEmailChange={setEmail}
        onAuthenticated={onAuthenticated}
        onError={(msg) => toast.error(msg)}
        onBack={() => navigate('/')}
      />
    </div>
  );
}
