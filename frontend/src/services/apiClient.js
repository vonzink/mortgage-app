// Single axios instance for all backend calls.
//
// Auth token: read from sessionStorage where react-oidc-context stores the
// active OIDC user. We send the id_token (not access_token) — the backend
// resolves users by email, which is only present in id_token claims.
//
// 401: dispatch a window event so App.js can trigger a fresh sign-in redirect
// without each call site needing to know about auth.

import axios from 'axios';
import { cognitoOidcConfig } from '../auth/cognitoConfig';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const apiClient = axios.create({ baseURL: API_BASE_URL });

function readOidcUser() {
  // react-oidc-context stores under this key. See:
  // https://github.com/authts/oidc-client-ts/blob/main/docs/oidc-client-ts.md
  const key = `oidc.user:${cognitoOidcConfig.authority}:${cognitoOidcConfig.client_id}`;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function currentIdToken() {
  const u = readOidcUser();
  return u?.id_token || u?.access_token || null;
}

apiClient.interceptors.request.use((config) => {
  const token = currentIdToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL };
