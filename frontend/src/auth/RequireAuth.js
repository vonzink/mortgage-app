import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';

/**
 * Gate component for protected routes. Renders children once authenticated.
 * If not authenticated, routes to the first-class passwordless page (/signin)
 * carrying the blocked path as `returnTo` — SignInPage hard-navigates back there
 * once the OTP/passkey ceremony mints the session. This gate is a borrower-facing
 * entry (a cold deep link to /apply), so it must NOT hand them the Cognito Hosted
 * UI; the whole point of the passwordless cutover is that nobody sees a password.
 *
 * Use:
 *   <Route path="/applications" element={
 *     <RequireAuth><ApplicationList /></RequireAuth>
 *   } />
 */
export default function RequireAuth({ children }) {
  // LOCAL-ONLY — mirrors the suite dev-header bridge + apiClient's X-Dev-* injection.
  // When REACT_APP_DEV_SUB is set we bypass Cognito entirely and render children directly.
  // In prod REACT_APP_DEV_SUB is unset so real OIDC is unaffected.
  // Do not weaken the real-auth branches below.
  const devAuthBypass = !!process.env.REACT_APP_DEV_SUB;

  const auth = useAuth();
  const navigate = useNavigate();

  // Side-effect: route AFTER render commits, never during. `activeNavigator` is set
  // while a Hosted-UI redirect is in-flight (still possible via break-glass paths) —
  // guard on it so we don't yank a ceremony that's already under way.
  useEffect(() => {
    if (devAuthBypass) return;
    if (auth.isLoading) return;
    if (auth.isAuthenticated) return;
    if (auth.error) return;
    if (auth.activeNavigator) return;

    navigate('/signin', {
      replace: true,
      state: { returnTo: window.location.pathname + window.location.search },
    });
  }, [devAuthBypass, auth.isLoading, auth.isAuthenticated, auth.error, auth.activeNavigator, navigate]);

  if (devAuthBypass) return children;

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
        <p style={{ color: '#a8423a' }}>{auth.error.message}</p>
        <button onClick={() => navigate('/signin', { state: { returnTo: window.location.pathname } })}>
          Sign in again
        </button>
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
