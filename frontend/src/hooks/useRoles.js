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
  // Any back-office role — i.e. "can this person use the suite". Gates staff-only chrome
  // (the global loan search, the client surfaces) and the "Edit in suite" deep link.
  //
  // MUST mirror the suite's own STAFF set (SecurityConfig.STAFF = LO, PROCESSOR,
  // UNDERWRITER, CLOSER, MANAGER, ADMIN). Too narrow is the dangerous direction: because
  // isBorrower below is "not staff and not agent", a missing group does not merely hide
  // chrome — it reclassifies a back-office user as a CLIENT. UNDERWRITER and CLOSER were
  // missing here until 2026-08-02, so both roles were served the borrower experience while
  // holding full suite access.
  //
  // Group names are the live pool's and mix conventions on purpose (Admin/LO/Processor/
  // Manager TitleCase, UNDERWRITER/CLOSER upper) — they are matched literally, so do not
  // "normalize" them without changing the Cognito groups first.
  const isStaff = has('Admin') || has('LO') || has('Processor') || has('Manager')
    || has('UNDERWRITER') || has('CLOSER');
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
