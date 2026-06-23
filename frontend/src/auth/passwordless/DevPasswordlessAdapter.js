/**
 * LOCAL-ONLY passwordless adapter. No real email/code — requestCode is a no-op success and
 * verifyCode accepts any code, resolving as the dev borrower. The app already treats the dev
 * borrower as signed-in (RequireAuth bypass + apiClient X-Dev-* headers), so no token is minted.
 */
export const DevPasswordlessAdapter = {
  kind: 'dev',
  async requestCode(_email) { return { sent: true }; },
  async verifyCode(_email, _code) { return { ok: true }; },
};
