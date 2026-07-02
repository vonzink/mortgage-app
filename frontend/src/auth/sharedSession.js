/**
 * Shared-session cookie ("msfg_sso") for the app ⇄ suite-console SSO handoff.
 * After a STAFF login/renew, the Cognito refresh token (shared app client) is
 * mirrored into a .msfgco.com cookie so suite.msfgco.com can adopt the session
 * silently. Borrower sessions never leave this origin. The cookie is a pointer,
 * not a session — Cognito arbitrates validity on every exchange.
 * Spec: msfg-suite docs/superpowers/specs/2026-07-02-lo-suite-handoff-sso-design.md
 */
export const SSO_COOKIE = 'msfg_sso';

// Cognito group names as they appear in the id_token (see hooks/useRoles.js).
// Underwriter/Closer included ahead of provisioning those groups.
const STAFF_GROUPS = ['Admin', 'LO', 'Processor', 'Manager', 'Underwriter', 'Closer'];

// mortgage-app-web client refresh tokens live 5 days — cookie must not outlive them.
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
 * Returns true when written; false when refused (non-staff / no token / expired).
 */
export function writeSharedSessionCookie(user) {
  if (!user || user.expired || !user.refresh_token) return false;
  if (!isStaffProfile(user.profile)) return false;
  const payload = { v: 1, cid: process.env.REACT_APP_COGNITO_CLIENT_ID, rt: user.refresh_token };
  document.cookie = `${SSO_COOKIE}=${btoa(JSON.stringify(payload))}${cookieAttrs()}; Max-Age=${COOKIE_MAX_AGE_SECONDS}`;
  return true;
}

export function clearSharedSessionCookie() {
  document.cookie = `${SSO_COOKIE}=${cookieAttrs()}; Max-Age=0`;
}
