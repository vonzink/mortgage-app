import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';

/**
 * Thin redirector for `/login` and `/signup` direct links.
 *   - login  → the first-class passwordless /signin page, back to /applications
 *   - signup → the SAME passwordless page, back to /apply (a new account and a
 *     returning one are the same email-OTP ceremony: CognitoOtpAdapter.start
 *     self-SignUps an unknown address before requesting the code)
 *
 * Neither mode touches the Cognito Hosted UI any more. `buildCognitoSignupUrl`
 * stays in cognitoConfig as break-glass, with no caller.
 */
export default function AuthRedirect({ mode = 'login' }) {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isLoading) return;
    if (auth.isAuthenticated) {
      navigate('/applications', { replace: true });
      return;
    }
    navigate('/signin', {
      replace: true,
      state: { returnTo: mode === 'signup' ? '/apply' : '/applications' },
    });
  }, [auth.isLoading, auth.isAuthenticated, mode, auth, navigate]);

  return (
    <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: 'calc(100vh - 64px)' }}>
      <div className="muted">{mode === 'signup' ? 'Taking you to sign-up…' : 'Taking you to sign-in…'}</div>
    </div>
  );
}
