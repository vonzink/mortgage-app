import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

/**
 * Shared axios instance for all API calls. A request interceptor pulls the current
 * Cognito access token out of sessionStorage (where react-oidc-context / oidc-client-ts
 * keeps the User object) and attaches it as a Bearer token.
 *
 * If there is no signed-in user, the request goes out without an Authorization header
 * and the backend will reject it with 401 — at which point a RequireAuth wrapper
 * upstream will kick the user into the sign-in flow.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

/** Read the current Cognito user from oidc-client-ts's sessionStorage entry. */
function getStoredUser() {
  const authority = process.env.REACT_APP_COGNITO_AUTHORITY;
  const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
  const key = `oidc.user:${authority}:${clientId}`;
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

apiClient.interceptors.request.use((config) => {
  const user = getStoredUser();
  // Prefer id_token over access_token: Cognito access tokens don't carry the `email`
  // claim, but the backend needs it to resolve/materialize a local users row. Both are
  // signed by the same JWK set, so Spring's resource server happily validates either.
  // (Mirrors the dashboard's pattern in dashboard.msfgco.com/js/api-server.js.)
  const token = user?.id_token || user?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 handler: silent renew didn't catch us in time, or refresh failed. Don't silently wipe
// the user (loses form data); fire an `auth:expired` event so the App can route through
// signinRedirect, preserving any drafts in sessionStorage.
let authExpiredFired = false;
apiClient.interceptors.response.use(
  (resp) => resp,
  (err) => {
    if (err.response?.status === 401 && !authExpiredFired) {
      authExpiredFired = true;
      // eslint-disable-next-line no-console
      console.warn('[apiClient] 401 received — dispatching auth:expired');
      window.dispatchEvent(new CustomEvent('auth:expired', {
        detail: { url: err.config?.url, method: err.config?.method },
      }));
      // Reset the latch a tick later so subsequent natural 401s after re-auth still fire
      setTimeout(() => { authExpiredFired = false; }, 5000);
    }
    return Promise.reject(err);
  }
);

export default apiClient;
