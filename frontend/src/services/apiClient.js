import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';
// The msfg-suite (system of record) base — used for loans, /me, intake. In local dev one base (the
// suite) serves everything, so default to API_BASE_URL there; in prod it's the suite's own origin
// (https://los.msfgco.com/api) set via REACT_APP_SUITE_API_URL.
const SUITE_API_BASE_URL =
  process.env.REACT_APP_SUITE_API_URL || API_BASE_URL || 'http://localhost:8080/api';

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

/** Request interceptor: attach the Cognito bearer (+ local dev headers). Shared by every client. */
function attachAuth(config) {
  const user = getStoredUser();
  // Prefer id_token over access_token: Cognito access tokens don't carry the `email` claim, but the
  // backend needs it to resolve/materialize a local users row. Both are signed by the same JWK set.
  const token = user?.id_token || user?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // LOCAL-ONLY: no real Cognito locally — send suite dev headers so the suite's local bridge scopes
  // us as the borrower. Inert in any build without REACT_APP_DEV_SUB.
  if (process.env.REACT_APP_DEV_SUB) {
    config.headers['X-Dev-Sub'] = process.env.REACT_APP_DEV_SUB;
    config.headers['X-Dev-Roles'] = process.env.REACT_APP_DEV_ROLES || 'Borrower';
    config.headers['X-Dev-Org'] = process.env.REACT_APP_DEV_ORG || '';
  }
  return config;
}

// 401 handler: silent renew didn't catch us in time, or refresh failed. Don't silently wipe the user
// (loses form data); fire an `auth:expired` event so the App can route through signinRedirect. Shared
// latch across clients so a burst of 401s only fires once.
let authExpiredFired = false;
function handle401(err) {
  if (err.response?.status === 401 && !authExpiredFired) {
    authExpiredFired = true;
    // eslint-disable-next-line no-console
    console.warn('[apiClient] 401 received — dispatching auth:expired');
    window.dispatchEvent(new CustomEvent('auth:expired', {
      detail: { url: err.config?.url, method: err.config?.method },
    }));
    setTimeout(() => { authExpiredFired = false; }, 5000);
  }
  return Promise.reject(err);
}

function createClient(baseURL) {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  });
  client.interceptors.request.use(attachAuth);
  client.interceptors.response.use((resp) => resp, handle401);
  return client;
}

// The mortgage-app backend (loan-applications, admin, documents, mismo, folder eval).
const apiClient = createClient(API_BASE_URL);

// The msfg-suite system of record (loans, /me, intake). mortgageService routes its suite methods here.
export const suiteClient = createClient(SUITE_API_BASE_URL);

export default apiClient;
