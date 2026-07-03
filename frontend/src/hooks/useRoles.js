import { useAuth } from 'react-oidc-context';

/**
 * Reads the user's Cognito groups from the id_token profile and exposes
 * convenience helpers. Cognito puts group memberships in `cognito:groups`.
 *
 * Treat these as a UI hint only — the backend re-checks with @PreAuthorize on every call.
 */
export default function useRoles() {
  // Defensive: useAuth() is undefined outside an AuthProvider (some test/render trees) —
  // degrade to "no groups" (→ borrower default) rather than crash; this is a UI hint only.
  const auth = useAuth();
  const groups = auth?.user?.profile?.['cognito:groups'] || [];
  const has = (role) => Array.isArray(groups) && groups.includes(role);
  // Any back-office role. Used to gate staff-only chrome (e.g. the global loan
  // search) out of the client/borrower view.
  const isStaff = has('Admin') || has('LO') || has('Processor') || has('Manager');
  return {
    groups,
    isAdmin: has('Admin'),
    isLO: has('LO'),
    isProcessor: has('Processor'),
    isManager: has('Manager'),
    // DEFAULT-BORROWER (2026-07-03): funnel signups carry NO Cognito groups, and treating
    // them as "neither borrower nor staff" routed real clients into the staff-ish default
    // views (pipeline chrome, read-only staff documents panel — the walkthrough findings).
    // Least privilege: anyone who isn't staff or an agent IS a borrower. The backend
    // re-checks real authorization on every call regardless.
    isBorrower: has('Borrower') || (!isStaff && !has('RealEstateAgent')),
    isStaff,
    hasRole: has,
  };
}
