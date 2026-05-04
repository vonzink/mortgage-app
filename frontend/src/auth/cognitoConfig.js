/**
 * Cognito Hosted UI / OIDC config.
 *
 * Authority is the Cognito user-pool's IDP URL — that's where react-oidc-context fetches
 * the OpenID discovery document, which in turn points at the hosted UI's authorize/token
 * endpoints. Don't set authority to the hosted UI domain (common mistake).
 *
 * Cognito does not implement RP-Initiated Logout the way `oidc-client-ts` expects, so
 * sign-out goes through the Cognito-specific /logout endpoint with `client_id` and
 * `logout_uri` query params — handled in `signOut()` below, not by the library.
 */
export const cognitoConfig = {
  authority: process.env.REACT_APP_COGNITO_AUTHORITY,
  client_id: process.env.REACT_APP_COGNITO_CLIENT_ID,
  redirect_uri: process.env.REACT_APP_COGNITO_REDIRECT_URI,
  response_type: 'code',
  scope: 'openid email profile',

  // Token refresh strategy: oidc-client-ts will use the refresh_token returned by Cognito's
  // auth-code grant to silently get a new access token before the current one expires.
  // No iframe required (Cognito doesn't play well with iframe-based silent renew).
  automaticSilentRenew: true,
  // Start renewing 5 minutes before expiry. Cognito access tokens default to 60 min, so
  // we get a generous renewal window — even if the renew request itself fails once, there's
  // time to retry before a real expiry.
  accessTokenExpiringNotificationTimeInSeconds: 300,

  // Cognito's userinfo endpoint works, but the ID token already carries everything we need —
  // saves a round-trip on each load.
  loadUserInfo: false,

  // Skip iframe-based session monitoring (Cognito doesn't broadcast session-changed events).
  monitorSession: false,
};

/**
 * Cognito's logout flow: redirect to {DOMAIN}/logout?client_id=...&logout_uri=...
 * The user is signed out of the hosted UI session, then bounced back to our app.
 */
export function buildCognitoLogoutUrl() {
  const domain = process.env.REACT_APP_COGNITO_DOMAIN;
  const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
  const logoutUri = process.env.REACT_APP_COGNITO_POST_LOGOUT_REDIRECT_URI;
  return `${domain}/logout?client_id=${encodeURIComponent(clientId)}&logout_uri=${encodeURIComponent(logoutUri)}`;
}
