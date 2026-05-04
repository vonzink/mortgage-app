import React from 'react';
import { useAuth } from 'react-oidc-context';

/**
 * Gate component for protected routes. Renders children once authenticated.
 * If not authenticated, kicks off the Cognito redirect flow.
 *
 * Use:
 *   <Route path="/applications" element={
 *     <RequireAuth><ApplicationList /></RequireAuth>
 *   } />
 */
export default function RequireAuth({ children }) {
  const auth = useAuth();

  // While react-oidc-context is bootstrapping (page just loaded, has refresh token, etc.)
  if (auth.isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Checking your sign-in…
      </div>
    );
  }

  // OIDC error path (token expired, network failure during silent renew, etc.)
  if (auth.error) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Sign-in error</h2>
        <p style={{ color: '#b91c1c' }}>{auth.error.message}</p>
        <button onClick={() => auth.signinRedirect()}>Sign in again</button>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    // Trigger the Cognito hosted UI redirect. Returns once redirect happens.
    auth.signinRedirect({
      // After successful sign-in, return to the page they were trying to reach.
      state: { returnTo: window.location.pathname + window.location.search },
    });
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Redirecting to sign-in…
      </div>
    );
  }

  return children;
}
