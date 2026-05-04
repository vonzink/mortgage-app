import React from 'react';
import { useAuth } from 'react-oidc-context';
import { FaSignInAlt, FaSignOutAlt, FaUserCircle } from 'react-icons/fa';
import { buildCognitoLogoutUrl } from '../auth/cognitoConfig';

/**
 * Header sign-in/out controls. Three states:
 *   - bootstrapping (auth.isLoading) → quiet placeholder
 *   - signed out → "Sign in" button → kicks off Cognito redirect
 *   - signed in → name + sign-out button → goes through Cognito's /logout endpoint
 *
 * Sign-out is special with Cognito: the OIDC standard's `signoutRedirect()` doesn't quite
 * line up with Cognito's hosted-UI logout. We hand-build the URL via {@link buildCognitoLogoutUrl}
 * and clear the local OIDC state ourselves.
 */
const buttonStyle = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.4)',
  color: 'white',
  cursor: 'pointer',
  padding: '0.4rem 0.85rem',
  borderRadius: '4px',
  fontSize: '0.85rem',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
};

export default function AuthControls() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>…</span>;
  }

  if (auth.error) {
    return (
      <button style={buttonStyle} onClick={() => auth.signinRedirect()} title={auth.error.message}>
        <FaSignInAlt /> Retry sign-in
      </button>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <button style={buttonStyle} onClick={() => auth.signinRedirect()}>
        <FaSignInAlt /> Sign in
      </button>
    );
  }

  // Signed in — show name + sign out
  const profile = auth.user?.profile || {};
  const displayName = profile.name || profile.email || 'Signed in';

  const handleSignOut = async () => {
    // Wipe local OIDC state first so the next page load doesn't try to use a stale token
    await auth.removeUser();
    // Then bounce through Cognito's hosted UI logout (which clears the cookie set by
    // the hosted UI session) and lands on REACT_APP_COGNITO_POST_LOGOUT_REDIRECT_URI.
    window.location.href = buildCognitoLogoutUrl();
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
      <span style={{ color: 'white', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
        <FaUserCircle />
        {displayName}
      </span>
      <button style={buttonStyle} onClick={handleSignOut}>
        <FaSignOutAlt /> Sign out
      </button>
    </div>
  );
}
