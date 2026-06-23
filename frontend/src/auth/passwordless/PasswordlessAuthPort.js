import { DevPasswordlessAdapter } from './DevPasswordlessAdapter';
import { CognitoOtpAdapter } from './CognitoOtpAdapter';

/**
 * Returns the active passwordless adapter. Local dev (REACT_APP_DEV_SUB set) -> DevPasswordlessAdapter;
 * otherwise the Cognito email-OTP adapter (deferred). Mirrors the apiClient dev-vs-real split.
 */
export function getPasswordlessAuth() {
  return process.env.REACT_APP_DEV_SUB ? DevPasswordlessAdapter : CognitoOtpAdapter;
}
