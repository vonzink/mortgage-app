import { getPasswordlessAuth } from './PasswordlessAuthPort';
import { Factor } from './factors';

describe('passwordless dev adapter (widened contract)', () => {
  const OLD = process.env.REACT_APP_DEV_SUB;
  beforeAll(() => { process.env.REACT_APP_DEV_SUB = '00000000-0000-0000-0000-0000000000b0'; });
  afterAll(() => { process.env.REACT_APP_DEV_SUB = OLD; });

  test('selects the dev adapter when REACT_APP_DEV_SUB is set', () => {
    expect(getPasswordlessAuth().kind).toBe('dev');
  });

  test('availableFactors offers passkey + email but HIDES SMS', () => {
    const auth = getPasswordlessAuth();
    const factors = auth.availableFactors();
    expect(factors).toContain(Factor.EMAIL_OTP);
    expect(factors).toContain(Factor.PASSKEY);
    expect(factors).not.toContain(Factor.SMS_OTP);
  });

  test('start → respond (OTP) resolves a user; any code accepted', async () => {
    const auth = getPasswordlessAuth();
    const state = await auth.start('ann@example.com', Factor.EMAIL_OTP);
    expect(state).toMatchObject({ kind: 'otp', factor: Factor.EMAIL_OTP, username: 'ann@example.com' });
    const res = await auth.respond(state, { code: '000000' });
    expect(res).toMatchObject({ user: expect.any(Object) });
  });

  test('start (passkey) returns a passkey state', async () => {
    const auth = getPasswordlessAuth();
    const state = await auth.start('ann@example.com', Factor.PASSKEY);
    expect(state).toMatchObject({ kind: 'passkey', factor: Factor.PASSKEY });
  });

  test('passkey management methods are present and resolve', async () => {
    const auth = getPasswordlessAuth();
    await expect(auth.registerPasskey('tok')).resolves.toEqual({ ok: true });
    await expect(auth.listPasskeys('tok')).resolves.toEqual([]);
    await expect(auth.deletePasskey('tok', 'cred')).resolves.toEqual({ ok: true });
  });
});
