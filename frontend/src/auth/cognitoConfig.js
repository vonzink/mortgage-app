// OIDC config for Cognito Hosted UI. Plug values into .env (see .env.example).
//
// The id_token (not access_token) is what the backend wants in the Authorization
// header — Cognito access tokens omit the `email` claim that CurrentUserService
// uses for borrower lookup. Both are signed by the same JWK set so signature
// validation passes either way.

const region = process.env.REACT_APP_COGNITO_REGION || 'us-west-1';
const userPoolId = process.env.REACT_APP_COGNITO_USER_POOL_ID || 'us-west-1_S6iE2uego';
const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID || '';
const cognitoDomain = process.env.REACT_APP_COGNITO_DOMAIN || '';

const redirectUri =
  process.env.REACT_APP_COGNITO_REDIRECT_URI ||
  `${window.location.origin}/auth/callback`;

const postLogoutRedirectUri =
  process.env.REACT_APP_COGNITO_POST_LOGOUT_REDIRECT_URI ||
  window.location.origin;

export const cognitoOidcConfig = {
  authority: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
  client_id: clientId,
  redirect_uri: redirectUri,
  post_logout_redirect_uri: postLogoutRedirectUri,
  response_type: 'code',
  scope: 'openid email profile',
  loadUserInfo: false, // Cognito's userinfo endpoint requires the access token; we keep it simple
  automaticSilentRenew: true,
  monitorSession: false,
};

/** URL for the Cognito Hosted UI logout — Cognito needs this exact form. */
export function buildCognitoLogoutUrl() {
  if (!cognitoDomain || !clientId) return postLogoutRedirectUri;
  const logout = `https://${cognitoDomain}/logout`;
  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: postLogoutRedirectUri,
  });
  return `${logout}?${params.toString()}`;
}

export const cognitoConfigured = Boolean(clientId && cognitoDomain);
