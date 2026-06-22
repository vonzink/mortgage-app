/**
 * Cognito email one-time-code adapter (DEFERRED — requires Cognito passwordless enabled by the owner:
 * custom-auth Lambda triggers (DefineAuthChallenge/CreateAuthChallenge/VerifyAuthChallenge) or managed
 * email-OTP). Contract:
 *   requestCode(email): InitiateAuth(CUSTOM_AUTH) -> CreateAuthChallenge emails a 6-digit code -> { sent }.
 *   verifyCode(email, code): RespondToAuthChallenge -> on success store the resulting tokens where
 *     oidc-client-ts/apiClient read them (sessionStorage `oidc.user:<authority>:<clientId>`), then { ok }.
 * Throws "not-implemented" until the Cognito passwordless slice lands.
 */
export const CognitoOtpAdapter = {
  kind: 'cognito',
  async requestCode(_email) { throw new Error('CognitoOtpAdapter not implemented — Cognito passwordless not enabled'); },
  async verifyCode(_email, _code) { throw new Error('CognitoOtpAdapter not implemented — Cognito passwordless not enabled'); },
};
