process.env.REACT_APP_COGNITO_CLIENT_ID = process.env.REACT_APP_COGNITO_CLIENT_ID || 'test-client-id';

import {
  SSO_COOKIE,
  isStaffProfile,
  cookieDomainAttrFor,
  writeSharedSessionCookie,
  clearSharedSessionCookie,
  adoptSharedSession,
  readSharedSessionCookie,
} from './sharedSession';

// ── adoptSharedSession collaborators (adopt-side tests only) ─────────────────
const mockGetUser = jest.fn();
const mockMintSession = jest.fn();
jest.mock('./passwordless/cognitoSession', () => ({
  getUserManager: () => ({ getUser: mockGetUser }),
  mintSession: (...args) => mockMintSession(...args),
  // Encode staff-ness in the fake id_token string so tests can steer isStaffIdToken.
  decodeJwtPayload: (token) => {
    if (token === 'STAFF') return { 'cognito:groups': ['LO'] };
    if (token === 'BORROWER') return { 'cognito:groups': ['Borrower'] };
    return {};
  },
}));
jest.mock('./cognitoConfig', () => ({
  cognitoAuthority: 'https://cognito-idp.us-west-1.amazonaws.com/us-west-1_pool',
}));

afterEach(() => {
  document.cookie = `${SSO_COOKIE}=; Path=/; Max-Age=0`;
});

describe('isStaffProfile', () => {
  test.each([['Admin'], ['LO'], ['Processor'], ['Manager'], ['Underwriter'], ['Closer']])(
    '%s → staff', (g) => expect(isStaffProfile({ 'cognito:groups': [g] })).toBe(true),
  );
  test('Borrower / empty / missing → not staff', () => {
    expect(isStaffProfile({ 'cognito:groups': ['Borrower'] })).toBe(false);
    expect(isStaffProfile({ 'cognito:groups': [] })).toBe(false);
    expect(isStaffProfile({})).toBe(false);
    expect(isStaffProfile(null)).toBe(false);
  });
});

describe('cookieDomainAttrFor', () => {
  test('msfgco hosts get the parent-domain attr', () => {
    expect(cookieDomainAttrFor('app.msfgco.com')).toBe('; Domain=.msfgco.com');
    expect(cookieDomainAttrFor('msfgco.com')).toBe('; Domain=.msfgco.com');
  });
  test('localhost and lookalikes do not', () => {
    expect(cookieDomainAttrFor('localhost')).toBe('');
    expect(cookieDomainAttrFor('evil-msfgco.com')).toBe('');
  });
});

describe('writeSharedSessionCookie', () => {
  const staffUser = (over = {}) => ({
    expired: false,
    refresh_token: 'rt-abc',
    profile: { 'cognito:groups': ['LO'] },
    ...over,
  });

  test('staff user with refresh token → cookie written with {v,cid,rt}', () => {
    expect(writeSharedSessionCookie(staffUser())).toBe(true);
    const value = document.cookie.match(new RegExp(`${SSO_COOKIE}=([^;]*)`))[1];
    expect(JSON.parse(atob(value))).toEqual({
      v: 1,
      cid: process.env.REACT_APP_COGNITO_CLIENT_ID,
      rt: 'rt-abc',
    });
  });

  test('borrower → refused', () => {
    expect(writeSharedSessionCookie(staffUser({ profile: { 'cognito:groups': ['Borrower'] } }))).toBe(false);
    expect(document.cookie).not.toContain(SSO_COOKIE + '=');
  });

  test('no refresh token / expired / null user → refused', () => {
    expect(writeSharedSessionCookie(staffUser({ refresh_token: undefined }))).toBe(false);
    expect(writeSharedSessionCookie(staffUser({ expired: true }))).toBe(false);
    expect(writeSharedSessionCookie(null)).toBe(false);
  });

  test('missing REACT_APP_COGNITO_CLIENT_ID → refused', () => {
    const saved = process.env.REACT_APP_COGNITO_CLIENT_ID;
    delete process.env.REACT_APP_COGNITO_CLIENT_ID;
    try {
      expect(writeSharedSessionCookie(staffUser())).toBe(false);
      expect(document.cookie).not.toContain(SSO_COOKIE + '=');
    } finally {
      process.env.REACT_APP_COGNITO_CLIENT_ID = saved;
    }
  });

  // jsdom cannot read attributes back from document.cookie, so assert the raw
  // string handed to the setter — this is the security-critical surface.
  test('emitted cookie string carries Path/SameSite/Max-Age (no Domain/Secure on localhost)', () => {
    const spy = jest.spyOn(document, 'cookie', 'set');
    try {
      expect(writeSharedSessionCookie(staffUser())).toBe(true);
      const set = spy.mock.calls[0][0];
      expect(set).toContain('Path=/');
      expect(set).toContain('SameSite=Lax');
      expect(set).toContain('Max-Age=432000');
      // Tests run on http://localhost: host-only cookie, no Secure — intentional.
      expect(set).not.toContain('Domain=');
      expect(set).not.toContain('Secure');
    } finally {
      spy.mockRestore();
    }
  });

  test('clearSharedSessionCookie removes it', () => {
    writeSharedSessionCookie(staffUser());
    clearSharedSessionCookie();
    expect(document.cookie).not.toContain(SSO_COOKIE + '=');
  });
});

test('canonical cross-repo cookie fixture decodes (suite-web pins the same literal)', () => {
  const FIXTURE = 'eyJ2IjoxLCJjaWQiOiIzNHJnMHZxb29iZnY4aGh2ZzhrdW5rZDczOCIsInJ0IjoiZml4dHVyZS1ydCJ9';
  expect(JSON.parse(atob(FIXTURE))).toEqual({ v: 1, cid: '34rg0vqoobfv8hhvg8kunkd738', rt: 'fixture-rt' });
});

describe('adoptSharedSession', () => {
  const CID = 'client-x';
  const setCookie = (obj) => { document.cookie = `${SSO_COOKIE}=${btoa(JSON.stringify(obj))}; Path=/`; };
  const mockRefreshOk = (idToken) =>
    global.fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ AuthenticationResult: { IdToken: idToken, RefreshToken: 'new-rt' } }),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_COGNITO_CLIENT_ID = CID;
    document.cookie = `${SSO_COOKIE}=; Path=/; Max-Age=0`;
    mockGetUser.mockResolvedValue(null); // no live local session by default
    global.fetch = jest.fn();
    // jsdom's AbortSignal lacks .timeout (real browsers have it) — polyfill so
    // cognitoRefresh's `AbortSignal.timeout(8000)` doesn't throw before fetch.
    if (!AbortSignal.timeout) AbortSignal.timeout = () => new AbortController().signal;
  });

  it('adopts a staff shared session and mints it', async () => {
    setCookie({ v: 1, cid: CID, rt: 'rt-1' });
    mockRefreshOk('STAFF');
    expect(await adoptSharedSession()).toBe(true);
    expect(mockMintSession).toHaveBeenCalledTimes(1);
  });

  it('fails closed on a non-staff refreshed token (clears the cookie)', async () => {
    setCookie({ v: 1, cid: CID, rt: 'rt-1' });
    mockRefreshOk('BORROWER');
    expect(await adoptSharedSession()).toBe(false);
    expect(mockMintSession).not.toHaveBeenCalled();
    expect(readSharedSessionCookie()).toBeNull(); // cleared
  });

  it('ignores a cookie minted for a different client id (no refresh, not cleared)', async () => {
    setCookie({ v: 1, cid: 'other-client', rt: 'rt-1' });
    expect(await adoptSharedSession()).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(readSharedSessionCookie()).not.toBeNull(); // sibling cookie left alone
  });

  it('does not refresh when a live local session already exists', async () => {
    mockGetUser.mockResolvedValue({ expired: false });
    setCookie({ v: 1, cid: CID, rt: 'rt-1' });
    expect(await adoptSharedSession()).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('clears the cookie on a Cognito 4xx but keeps it on a network error', async () => {
    setCookie({ v: 1, cid: CID, rt: 'rt-1' });
    global.fetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ __type: 'NotAuthorizedException' }) });
    expect(await adoptSharedSession()).toBe(false);
    expect(readSharedSessionCookie()).toBeNull();

    setCookie({ v: 1, cid: CID, rt: 'rt-2' });
    global.fetch.mockRejectedValueOnce(new Error('network down'));
    expect(await adoptSharedSession()).toBe(false);
    expect(readSharedSessionCookie()).not.toBeNull();
  });
});
