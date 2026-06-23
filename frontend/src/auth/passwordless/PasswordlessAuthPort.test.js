import { getPasswordlessAuth } from './PasswordlessAuthPort';

describe('passwordless dev adapter', () => {
  const OLD = process.env.REACT_APP_DEV_SUB;
  beforeAll(() => { process.env.REACT_APP_DEV_SUB = '00000000-0000-0000-0000-0000000000b0'; });
  afterAll(() => { process.env.REACT_APP_DEV_SUB = OLD; });

  test('selects the dev adapter when REACT_APP_DEV_SUB is set', () => {
    expect(getPasswordlessAuth().kind).toBe('dev');
  });
  test('requestCode resolves sent; verifyCode accepts any code', async () => {
    const auth = getPasswordlessAuth();
    await expect(auth.requestCode('ann@example.com')).resolves.toEqual({ sent: true });
    await expect(auth.verifyCode('ann@example.com', '000000')).resolves.toMatchObject({ ok: true });
  });
});
