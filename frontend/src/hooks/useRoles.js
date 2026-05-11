import { useAuth } from 'react-oidc-context';

/**
 * Reads the user's Cognito groups from the id_token profile and exposes
 * convenience helpers. Cognito puts group memberships in `cognito:groups`.
 *
 * Treat these as a UI hint only — the backend re-checks with @PreAuthorize on every call.
 */
export default function useRoles() {
  const auth = useAuth();
  const groups = auth.user?.profile?.['cognito:groups'] || [];
  const has = (role) => Array.isArray(groups) && groups.includes(role);
  return {
    groups,
    isAdmin: has('Admin'),
    isLO: has('LO'),
    isProcessor: has('Processor'),
    isManager: has('Manager'),
    hasRole: has,
  };
}
