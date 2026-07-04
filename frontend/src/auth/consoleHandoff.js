/**
 * Staff → suite-console handoff. Phase-1 consolidation (2026-07-03): the LO loan
 * dashboard and the staff pipeline live in the suite console (suite.msfgco.com)
 * now, so an authenticated staff user is forwarded there instead of the in-app
 * staff surfaces. We (re)write the shared-session cookie first so the console can
 * adopt the session silently on arrival — belt-and-suspenders vs
 * {@link module:auth/SharedSessionCookieSync}, which already writes it at app boot.
 *
 * Admin + MISMO stay in this app (no console equivalent yet), so this is a
 * targeted forward from the retired surfaces, not a blanket lock-out.
 */
import { suiteWebUrl } from '../services/suiteWeb';
import { writeSharedSessionCookie } from './sharedSession';

/**
 * Forward an authenticated staff `user` to the suite console root.
 * No-op (returns false) when the console origin isn't configured, so
 * borrower-only / misconfigured builds fall back to in-app behavior.
 *
 * @param {object} user the react-oidc-context user (carries the refresh token)
 * @returns {boolean} true when a redirect was issued
 */
export function redirectStaffToConsole(user) {
  const base = suiteWebUrl();
  if (!base) return false;
  // Best-effort: make sure the SSO pointer cookie exists before we leave origin.
  try {
    writeSharedSessionCookie(user);
  } catch (_) {
    /* the cookie is an optional pointer; the console can still passwordless-login */
  }
  window.location.replace(base);
  return true;
}
