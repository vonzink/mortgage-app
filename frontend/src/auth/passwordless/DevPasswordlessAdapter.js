/**
 * LOCAL-ONLY passwordless adapter, mirroring the widened CognitoOtpAdapter contract
 * (spec §5.1). No real Cognito/email/SMS/WebAuthn — every factor is accepted and no
 * real token is minted. The app already treats the dev borrower as signed-in
 * (RequireAuth bypass + apiClient X-Dev-* headers), so `respond` returns a synthetic
 * user object and writes nothing to oidc storage.
 *
 * Same shape as the real adapter so FactorChooser / SignInPage / ContinuePage are
 * adapter-agnostic: availableFactors / start / respond / registerPasskey /
 * listPasskeys / deletePasskey.
 */
import { Factor } from './factors';

export const DevPasswordlessAdapter = {
  kind: 'dev',

  // Dev offers email + passkey; SMS stays hidden (mirrors the real adapter's gate).
  availableFactors() {
    return [Factor.PASSKEY, Factor.EMAIL_OTP];
  },

  async start(username, factor = Factor.EMAIL_OTP) {
    return {
      kind: factor === Factor.PASSKEY ? 'passkey' : 'otp',
      factor,
      username,
      session: 'dev-session',
      destination: factor === Factor.PASSKEY ? null : username,
    };
  },

  // Accept any code / any passkey ceremony — resolve as the dev borrower.
  async respond(_state, _response = {}) {
    return { user: { kind: 'dev', profile: { sub: process.env.REACT_APP_DEV_SUB } } };
  },

  async registerPasskey(_accessToken) {
    return { ok: true };
  },

  async listPasskeys(_accessToken) {
    return [];
  },

  async deletePasskey(_accessToken, _credentialId) {
    return { ok: true };
  },
};

export default DevPasswordlessAdapter;
