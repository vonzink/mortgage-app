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
 * ── SDK (USER_AUTH) passwordless adapter config ──────────────────────────────
 *
 * `@aws-sdk/client-cognito-identity-provider` speaks the raw InitiateAuth/
 * RespondToAuthChallenge surface (oidc-client-ts does not). It needs the bare
 * user-pool client id + the AWS region — NOT the OIDC authority URL.
 *
 * CRITICAL: `cognitoAuthority` and `cognitoUserPoolClientId` MUST come from the
 * SAME env vars (`REACT_APP_COGNITO_AUTHORITY`, `REACT_APP_COGNITO_CLIENT_ID`)
 * that `apiClient.getStoredUser` keys its `oidc.user:<authority>:<clientId>`
 * sessionStorage lookup on. `cognitoSession.mintSession` writes under exactly
 * that key, so any drift here = the bearer never gets read = 401. Do not point
 * the SDK at a different client than the one apiClient reads.
 */
export const cognitoAuthority = process.env.REACT_APP_COGNITO_AUTHORITY;
export const cognitoUserPoolClientId = process.env.REACT_APP_COGNITO_CLIENT_ID;

/**
 * Region derived from the authority URL
 * (https://cognito-idp.<region>.amazonaws.com/<poolId>). Falls back to an explicit
 * REACT_APP_COGNITO_REGION, then us-west-1 (the current pool's region).
 */
export const cognitoRegion =
  process.env.REACT_APP_COGNITO_REGION ||
  (cognitoAuthority && cognitoAuthority.match(/cognito-idp\.([a-z0-9-]+)\.amazonaws\.com/)?.[1]) ||
  'us-west-1';

/**
 * WebAuthn Relying-Party id (spec §3.1 C3): the eTLD+1 `msfgco.com` so borrower
 * passkeys work across app.msfgco.com / apply.msfgco.com. This is ~immovable —
 * changing it later invalidates every enrolled passkey. The actual RP id used in a
 * ceremony is dictated by the pool's WebAuthnConfiguration / the challenge options
 * the SDK returns; this constant is the intended value for comments/config parity.
 * Dev passkeys need an RP id of `localhost` → a separate dev pool/config.
 */
export const webauthnRelyingPartyId = process.env.REACT_APP_WEBAUTHN_RP_ID || 'msfgco.com';

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

/**
 * Cognito Hosted UI sign-up direct entry. {DOMAIN}/signup with the same params
 * react-oidc-context would send to /login. Lands the user on the "Create
 * account" tab instead of the default "Sign in" tab.
 */
export function buildCognitoSignupUrl() {
  const domain = process.env.REACT_APP_COGNITO_DOMAIN;
  const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
  const redirect = process.env.REACT_APP_COGNITO_REDIRECT_URI;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: redirect,
  });
  return `${domain}/signup?${params.toString()}`;
}
