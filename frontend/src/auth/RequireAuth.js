import React, { useEffect } from 'react';
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

  // Side-effect: trigger Cognito redirect AFTER render commits, never during.
  // `activeNavigator` is set while a redirect is in-flight; we guard on it so
  // we don't fire signinRedirect repeatedly across re-renders.
  useEffect(() => {
    if (auth.isLoading) return;
    if (auth.isAuthenticated) return;
    if (auth.error) return;
    if (auth.activeNavigator) return;

    auth.signinRedirect({
      state: { returnTo: window.location.pathname + window.location.search },
    });
  }, [auth.isLoading, auth.isAuthenticated, auth.error, auth.activeNavigator, auth]);

  if (auth.isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Checking your sign-in…
      </div>
    );
  }

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
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Redirecting to sign-in…
      </div>
    );
  }

  return children;
}
