import React, { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { cognitoConfigured } from './cognitoConfig';

/**
 * Route guard. If the user is unauthenticated, kick to Cognito Hosted UI.
 * If Cognito isn't configured (missing env vars), render a clear setup message
 * instead of looping into a broken redirect.
 */
export default function RequireAuth({ children }) {
  const auth = useAuth();

  useEffect(() => {
    if (!cognitoConfigured) return;
    if (!auth.isLoading && !auth.isAuthenticated && !auth.activeNavigator) {
      auth.signinRedirect();
    }
  }, [auth, auth.isLoading, auth.isAuthenticated, auth.activeNavigator]);

  if (!cognitoConfigured) {
    return (
      <div style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
        <h2>Cognito not configured</h2>
        <p>
          Set <code>REACT_APP_COGNITO_CLIENT_ID</code> and{' '}
          <code>REACT_APP_COGNITO_DOMAIN</code> in <code>frontend/.env</code> and
          restart the dev server.
        </p>
      </div>
    );
  }

  if (auth.isLoading) return <div style={{ padding: '2rem' }}>Loading…</div>;
  if (auth.error) return <div style={{ padding: '2rem' }}>Sign-in error: {auth.error.message}</div>;
  if (!auth.isAuthenticated) return <div style={{ padding: '2rem' }}>Redirecting to sign-in…</div>;

  return children;
}
