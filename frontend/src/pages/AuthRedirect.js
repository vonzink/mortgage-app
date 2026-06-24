import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { buildCognitoSignupUrl } from '../auth/cognitoConfig';

/**
 * Thin redirector for `/login` and `/signup` direct links.
 *   - login  → the first-class passwordless /signin page (no Hosted-UI redirect)
 *   - signup → Cognito Hosted UI signup (unchanged — out of P3 scope)
 * Keeps the surface minimal and shareable.
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
    if (mode === 'signup') {
      window.location.href = buildCognitoSignupUrl();
    } else {
      navigate('/signin', { replace: true, state: { returnTo: '/applications' } });
    }
  }, [auth.isLoading, auth.isAuthenticated, mode, auth, navigate]);

  return (
    <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: 'calc(100vh - 64px)' }}>
      <div className="muted">{mode === 'signup' ? 'Taking you to sign-up…' : 'Taking you to sign-in…'}</div>
    </div>
  );
}
