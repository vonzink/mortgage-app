/**
 * cognitoSession — bridge a raw Cognito `AuthenticationResult` (from the SDK
 * USER_AUTH flow) into the exact oidc-client-ts session shape the rest of the app
 * already depends on.
 *
 * THE CRITICAL CONTRACT (spec §5.3):
 *  1. Write the oidc-client-ts `User` JSON under `oidc.user:${authority}:${clientId}`
 *     in sessionStorage — byte-identical to what oidc-client-ts itself writes, so
 *     `apiClient.getStoredUser` reads it unchanged. We get that for free by building
 *     a real `User` and calling `User.toStorageString()` (no hand-rolled JSON).
 *  2. The bearer that `apiClient` attaches is `id_token` (it prefers id_token —
 *     that token carries `org_id` + `cognito:groups`, which the suite needs). So we
 *     MUST populate `id_token`; `profile`/`expires_at` are decoded from it.
 *  3. Call the react-oidc-context UserManager's `storeUser(user)` so the library
 *     ADOPTS the session — `automaticSilentRenew` can then refresh via the
 *     `refresh_token`. `storeUser` both persists to the store AND raises the
 *     library's userLoaded event. Without it, SDK-minted tokens never renew.
 *
 * The UserManager here is constructed from `cognitoConfig` (same authority +
 * client_id + userStore as index.js's <AuthProvider>), so its store key is
 * identical to apiClient's lookup key. Verified: oidc-client-ts keys on
 * `oidc.user:<authority>:<client_id>` and `cognitoConfig` exports the same
 * authority/clientId env vars apiClient reads.
 */
import { User, UserManager } from 'oidc-client-ts';
import {
  cognitoConfig,
  cognitoAuthority,
  cognitoUserPoolClientId,
} from '../cognitoConfig';

/**
 * Decode a JWT payload (base64url) → object. No signature verification (the token
 * came straight from Cognito over TLS; the suite verifies the signature). Pure
 * claim extraction for `profile`/`expires_at`.
 */
export function decodeJwtPayload(jwt) {
  const part = jwt.split('.')[1];
  if (!part) throw new Error('malformed JWT');
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const json = decodeURIComponent(
    atob(b64 + pad)
      .split('')
      .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join('')
  );
  return JSON.parse(json);
}

// Lazily build a single UserManager mirroring the AuthProvider's settings so the
// store key + userStore match exactly. Reused across mints.
let _userManager = null;
export function getUserManager() {
  if (!_userManager) {
    _userManager = new UserManager({
      authority: cognitoConfig.authority,
      client_id: cognitoConfig.client_id,
      redirect_uri: cognitoConfig.redirect_uri,
      response_type: cognitoConfig.response_type,
      scope: cognitoConfig.scope,
      automaticSilentRenew: cognitoConfig.automaticSilentRenew,
      loadUserInfo: cognitoConfig.loadUserInfo,
      monitorSession: cognitoConfig.monitorSession,
    });
  }
  return _userManager;
}

// Test seam: allow tests to inject a UserManager double.
export function __setUserManagerForTest(mgr) {
  _userManager = mgr;
}

/** The sessionStorage key apiClient reads. Exported for tests/assertions. */
export function sessionStorageKey() {
  return `oidc.user:${cognitoAuthority}:${cognitoUserPoolClientId}`;
}

/**
 * Build an oidc-client-ts `User` from a Cognito `AuthenticationResult`.
 * AuthenticationResult shape (AWS SDK v3): { IdToken, AccessToken, RefreshToken,
 * TokenType, ExpiresIn }. `expires_at` is an absolute epoch-seconds value; we
 * prefer the id-token's own `exp` claim, falling back to now + ExpiresIn.
 */
export function buildUser(authResult) {
  const idToken = authResult?.IdToken;
  if (!idToken) throw new Error('AuthenticationResult missing IdToken');
  const accessToken = authResult?.AccessToken;
  const refreshToken = authResult?.RefreshToken;
  const profile = decodeJwtPayload(idToken);
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAt =
    typeof profile.exp === 'number'
      ? profile.exp
      : nowSec + (Number(authResult?.ExpiresIn) || 3600);

  return new User({
    id_token: idToken,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: authResult?.TokenType || 'Bearer',
    scope: cognitoConfig.scope,
    profile,
    expires_at: expiresAt,
  });
}

/**
 * Mint a browser session from a Cognito `AuthenticationResult`.
 * Persists the oidc-client-ts User and hands it to the UserManager so the library
 * adopts it. Returns the User.
 */
export async function mintSession(authResult) {
  const user = buildUser(authResult);
  // storeUser persists to the userStore under oidc.user:<authority>:<client_id>
  // (the exact key apiClient reads) AND lets react-oidc-context adopt the session
  // for automaticSilentRenew. This is the one call that satisfies both halves of
  // the §5.3 contract.
  await getUserManager().storeUser(user);
  return user;
}
