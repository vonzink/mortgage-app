/** @jest-environment-options {"url": "https://app.msfgco.com/"} */
// NOTE: the pragma above only takes effect on Jest >= 28 (react-scripts 5 ships
// Jest 27, which ignores it), so we ALSO point window.location at the prod origin
// directly — jsdom's `location` property is configurable in this environment.
// Covers the https + real-domain branch of cookieAttrs(): Domain + Secure emitted.
process.env.REACT_APP_COGNITO_CLIENT_ID = process.env.REACT_APP_COGNITO_CLIENT_ID || 'test-client-id';

import { SSO_COOKIE, writeSharedSessionCookie } from './sharedSession';

const staffUser = () => ({
  expired: false,
  refresh_token: 'rt-abc',
  profile: { 'cognito:groups': ['LO'] },
});

describe('writeSharedSessionCookie on https://app.msfgco.com', () => {
  let originalLocation;

  beforeAll(() => {
    originalLocation = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', {
      value: new URL('https://app.msfgco.com/'),
      configurable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', originalLocation);
  });

  test('emitted cookie string carries Domain=.msfgco.com and Secure', () => {
    const spy = jest.spyOn(document, 'cookie', 'set');
    try {
      expect(writeSharedSessionCookie(staffUser())).toBe(true);
      const set = spy.mock.calls[0][0];
      expect(set).toContain(`${SSO_COOKIE}=`);
      expect(set).toContain('Domain=.msfgco.com');
      expect(set).toContain('Secure');
      expect(set).toContain('SameSite=Lax');
      expect(set).toContain('Max-Age=432000');
    } finally {
      spy.mockRestore();
    }
  });
});
