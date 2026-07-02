import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { isStaffProfile, writeSharedSessionCookie, clearSharedSessionCookie } from './sharedSession';

/**
 * Keeps the .msfgco.com msfg_sso cookie in lockstep with the oidc session.
 * Runs on mount (boot restores the stored user) and whenever the user object
 * changes (sign-in adoption after the hard navigate, automaticSilentRenew).
 *
 *  - staff session      → (re)write the cookie
 *  - non-staff session  → clear it (stale-persona cleanup: borrower after staff)
 *  - no/expired session → leave it alone — a fresh pre-login tab must not kill
 *    an SSO cookie the suite console may still be relying on
 */
export default function SharedSessionCookieSync() {
  const auth = useAuth();
  useEffect(() => {
    const user = auth.user;
    if (!user || user.expired) return;
    if (isStaffProfile(user.profile)) {
      writeSharedSessionCookie(user);
    } else {
      clearSharedSessionCookie();
    }
  }, [auth.user]);
  return null;
}
