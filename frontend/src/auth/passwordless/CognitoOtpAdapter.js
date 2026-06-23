/**
 * Cognito email one-time-code adapter (native EMAIL_OTP via the USER_AUTH flow).
 *
 * Chosen mechanism (cutover decision D-B): Cognito's managed **EMAIL_OTP** — no custom-auth
 * Lambdas / SES wiring. Calls the Cognito IDP JSON API directly (these are unauthenticated
 * public-client operations — no SigV4 / SDK / credentials), so no new dependency.
 *
 *   requestCode(email): self-SignUp the borrower with a random password they never use (idempotent —
 *     UsernameExistsException is ignored), then InitiateAuth(USER_AUTH, PREFERRED_CHALLENGE=EMAIL_OTP).
 *     Cognito emails a 6-digit code; we stash the returned Session for verifyCode. → { sent: true }
 *   verifyCode(email, code): RespondToAuthChallenge(EMAIL_OTP) with the stashed Session + code. On
 *     success, write the returned tokens into the oidc-client-ts sessionStorage entry
 *     (`oidc.user:<authority>:<clientId>`) that apiClient + react-oidc-context read, so the borrower
 *     is treated as signed in. → { ok: true }
 *
 * ⚠️ UNVERIFIED against a live pool — verify during the Cognito cutover. Required pool config
 * (see docs/cutover/cognito-cutover-runbook.md, decision D-B):
 *   • Pool on the **Essentials** tier with **EMAIL_OTP** enabled as a sign-in factor.
 *   • App client (REACT_APP_COGNITO_CLIENT_ID) has the **USER_AUTH** (choice-based) auth flow + a
 *     public client (no secret).
 *   • **Self-service sign-up enabled**; email a required+verified attribute.
 * Open item to confirm live: whether a just-signed-up (unconfirmed) user can complete EMAIL_OTP
 * USER_AUTH directly, or needs a ConfirmSignUp step first — depends on the pool's passwordless config.
 * Because react-oidc-context caches the user in memory, ContinuePage does a hard navigation after a
 * cognito verify so the provider re-reads the freshly-stored user (SPA navigate would keep stale state).
 */

const AUTHORITY = process.env.REACT_APP_COGNITO_AUTHORITY;   // https://cognito-idp.{region}.amazonaws.com/{poolId}
const CLIENT_ID = process.env.REACT_APP_COGNITO_CLIENT_ID;
const SCOPE = 'openid email profile';

// Cognito IDP service endpoint = the authority's origin (no pool path).
function idpEndpoint() {
  return new URL(AUTHORITY).origin;
}

async function cognito(target, body) {
  const res = await fetch(idpEndpoint() + '/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch { /* non-JSON error body */ }
  if (!res.ok) {
    // Cognito errors carry __type, e.g. "UsernameExistsException", "CodeMismatchException".
    const type = (json.__type || '').split('#').pop() || `HTTP_${res.status}`;
    const err = new Error(json.message || type);
    err.cognitoType = type;
    throw err;
  }
  return json;
}

// A throwaway password that satisfies common Cognito policies (upper/lower/digit/symbol, len>=16).
// The borrower never sees or uses it — every sign-in is EMAIL_OTP.
function randomPassword() {
  const bytes = new Uint8Array(18);
  (window.crypto || window.msCrypto).getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/[^A-Za-z0-9]/g, '');
  return `Aa1!${b64}`.slice(0, 24);
}

function decodeJwtPayload(jwt) {
  try {
    let b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  } catch { return {}; }
}

// Module-scoped handle to the EMAIL_OTP challenge Session between requestCode and verifyCode.
let pending = null; // { email, session }

export const CognitoOtpAdapter = {
  kind: 'cognito',

  async requestCode(email) {
    if (!AUTHORITY || !CLIENT_ID) {
      throw new Error('Cognito is not configured (REACT_APP_COGNITO_AUTHORITY / _CLIENT_ID)');
    }
    // 1) Ensure the borrower has an account (idempotent). New funnel borrowers won't exist yet.
    try {
      await cognito('SignUp', {
        ClientId: CLIENT_ID,
        Username: email,
        Password: randomPassword(),
        UserAttributes: [{ Name: 'email', Value: email }],
      });
    } catch (e) {
      if (e.cognitoType !== 'UsernameExistsException') throw e; // already registered → fine
    }
    // 2) Start the EMAIL_OTP challenge — Cognito emails the code.
    const init = await cognito('InitiateAuth', {
      ClientId: CLIENT_ID,
      AuthFlow: 'USER_AUTH',
      AuthParameters: { USERNAME: email, PREFERRED_CHALLENGE: 'EMAIL_OTP' },
    });
    pending = { email, session: init.Session };
    return { sent: true };
  },

  async verifyCode(email, code) {
    const session = pending && pending.email === email ? pending.session : undefined;
    const resp = await cognito('RespondToAuthChallenge', {
      ClientId: CLIENT_ID,
      ChallengeName: 'EMAIL_OTP',
      Session: session,
      ChallengeResponses: { USERNAME: email, EMAIL_OTP_CODE: code },
    });
    const r = resp.AuthenticationResult;
    if (!r || !r.IdToken) {
      // A follow-on challenge (e.g. unconfirmed user) — surface so the caller can show an error.
      return { ok: false, challenge: resp.ChallengeName || 'unknown' };
    }
    // Persist tokens in the oidc-client-ts shape apiClient + react-oidc-context read.
    const user = {
      id_token: r.IdToken,
      access_token: r.AccessToken,
      refresh_token: r.RefreshToken,
      token_type: r.TokenType || 'Bearer',
      scope: SCOPE,
      profile: decodeJwtPayload(r.IdToken),
      expires_at: Math.floor(Date.now() / 1000) + (r.ExpiresIn || 3600),
    };
    sessionStorage.setItem(`oidc.user:${AUTHORITY}:${CLIENT_ID}`, JSON.stringify(user));
    pending = null;
    return { ok: true };
  },
};
