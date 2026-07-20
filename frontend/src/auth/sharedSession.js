/**
 * Shared-session cookie ("msfg_sso") for the app ⇄ suite-console SSO handoff.
 * After a STAFF login/renew, the Cognito refresh token (shared app client) is
 * mirrored into a .msfgco.com cookie so suite.msfgco.com can adopt the session
 * silently. Borrower sessions never leave this origin. The cookie is a pointer,
 * not a session — Cognito arbitrates validity on every exchange.
 * Spec: msfg-suite docs/superpowers/specs/2026-07-02-lo-suite-handoff-sso-design.md
 */
import { getUserManager, mintSession, decodeJwtPayload } from './passwordless/cognitoSession';
import { cognitoAuthority } from './cognitoConfig';

export const SSO_COOKIE = 'msfg_sso';

// Cognito group names as they appear in the id_token (see hooks/useRoles.js).
// Underwriter/Closer included ahead of provisioning those groups.
const STAFF_GROUPS = ['Admin', 'LO', 'Processor', 'Manager', 'Underwriter', 'Closer'];

// mortgage-app-web client refresh tokens live 5 days from ISSUANCE; renew-driven
// rewrites reset Max-Age from now, so the cookie may outlive the token — benign:
// the cookie is a pointer, and a dead token just fails the suite's exchange.
const COOKIE_MAX_AGE_SECONDS = 5 * 24 * 3600;

export function isStaffProfile(profile) {
  const groups = profile?.['cognito:groups'] || [];
  return Array.isArray(groups) && groups.some((g) => STAFF_GROUPS.includes(g));
}

/** Parent-domain attr only on real msfgco.com hosts (host-only elsewhere: localhost/tests). */
export function cookieDomainAttrFor(hostname) {
  return hostname === 'msfgco.com' || hostname.endsWith('.msfgco.com') ? '; Domain=.msfgco.com' : '';
}

function cookieAttrs() {
  const domain = cookieDomainAttrFor(window.location.hostname);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  return `; Path=/${domain}${secure}; SameSite=Lax`;
}

/**
 * Mirror the oidc user's refresh token into the shared cookie.
 * Returns true when written; false when refused (non-staff / no token / expired /
 * missing client id).
 */
export function writeSharedSessionCookie(user) {
  if (!user || user.expired || !user.refresh_token) return false;
  if (!isStaffProfile(user.profile)) return false;
  // Fail here at the writer, not cross-repo at the suite-console reader.
  const cid = process.env.REACT_APP_COGNITO_CLIENT_ID;
  if (!cid) return false;
  const payload = { v: 1, cid, rt: user.refresh_token };
  document.cookie = `${SSO_COOKIE}=${btoa(JSON.stringify(payload))}${cookieAttrs()}; Max-Age=${COOKIE_MAX_AGE_SECONDS}`;
  return true;
}

export function clearSharedSessionCookie() {
  document.cookie = `${SSO_COOKIE}=${cookieAttrs()}; Max-Age=0`;
}

/** Read + parse the shared cookie ({ v:1, cid, rt }); null when absent/malformed. */
export function readSharedSessionCookie() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SSO_COOKIE}=([^;]*)`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(atob(match[1]));
    return parsed && parsed.v === 1 && parsed.cid && parsed.rt ? parsed : null;
  } catch {
    return null;
  }
}

function isStaffIdToken(idToken) {
  try {
    return isStaffProfile(decodeJwtPayload(idToken));
  } catch {
    return false;
  }
}

/** Raw REFRESH_TOKEN_AUTH against the cognito-idp endpoint → AuthenticationResult (no AWS SDK). */
async function cognitoRefresh(clientId, refreshToken) {
  const endpoint = `${new URL(cognitoAuthority).origin}/`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: clientId,
      AuthParameters: { REFRESH_TOKEN: refreshToken },
    }),
    // Boot-blocking path: a hung connection must not mean a blank page for minutes.
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    let type;
    try {
      const body = await res.json();
      type = body && body.__type;
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(`cognito refresh failed: ${res.status}${type ? ` (${type})` : ''}`);
    err.cognitoType = type;
    err.status = res.status;
    throw err;
  }
  const out = await res.json();
  return out.AuthenticationResult;
}

/**
 * Boot-time adoption of the shared msfg_sso cookie — the mirror of the suite console's
 * adoptSharedSession. When a STAFF user arrives from the suite ("Open in borrower app") with no
 * live local session, refresh the cookie's refresh-token pointer into a full oidc session so they
 * land signed in instead of at the login screen. Fail-closed: a non-staff or Cognito-rejected
 * pointer is cleared; a transient network error keeps the cookie for the next boot.
 * Returns true when a session was adopted.
 */
export async function adoptSharedSession() {
  try {
    const existing = await getUserManager().getUser();
    if (existing && !existing.expired) return false; // already signed in here
  } catch {
    /* no stored user — proceed to adoption */
  }
  const cookie = readSharedSessionCookie();
  if (!cookie) return false;
  const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
  // A cookie minted for a different app client can't refresh under ours — ignore (don't clear).
  if (!clientId || cookie.cid !== clientId) return false;
  try {
    const result = await cognitoRefresh(cookie.cid, cookie.rt);
    // Both writers are staff-gated — a non-staff cookie is anomalous. Fail closed.
    if (!result || !result.IdToken || !isStaffIdToken(result.IdToken)) {
      clearSharedSessionCookie();
      return false;
    }
    // REFRESH_TOKEN_AUTH returns no new refresh token (rotation off) — carry the original through
    // so automaticSilentRenew keeps working.
    await mintSession({ ...result, RefreshToken: result.RefreshToken || cookie.rt });
    return true;
  } catch (e) {
    // 4xx from Cognito → the pointer is dead, clear it. A transient network/timeout is NOT a
    // verdict on the cookie — keep it for the next boot.
    if (e && typeof e.status === 'number' && e.status >= 400 && e.status < 500) {
      clearSharedSessionCookie();
    }
    return false;
  }
}
