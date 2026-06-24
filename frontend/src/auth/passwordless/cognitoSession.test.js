import {
  mintSession,
  buildUser,
  decodeJwtPayload,
  sessionStorageKey,
  __setUserManagerForTest,
} from './cognitoSession';

/** base64url-encode a JSON object (no padding) for a fake JWT payload. */
function b64urlJson(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
function fakeJwt(payload) {
  const header = b64urlJson({ alg: 'RS256', typ: 'JWT' });
  return `${header}.${b64urlJson(payload)}.sig`;
}

describe('cognitoSession.mintSession storage contract (spec §5.3)', () => {
  const PROFILE = {
    sub: 'borrower-sub-1',
    email: 'ann@example.com',
    org_id: '00000000-0000-0000-0000-0000000000aa',
    'cognito:groups': ['Borrower'],
    exp: 4102444800, // 2100-01-01
  };
  const ID_TOKEN = fakeJwt(PROFILE);

  const AUTH_RESULT = {
    IdToken: ID_TOKEN,
    AccessToken: 'access-tok',
    RefreshToken: 'refresh-tok',
    TokenType: 'Bearer',
    ExpiresIn: 3600,
  };

  beforeEach(() => {
    sessionStorage.clear();
  });

  test('decodeJwtPayload extracts claims', () => {
    expect(decodeJwtPayload(ID_TOKEN)).toMatchObject({
      sub: 'borrower-sub-1',
      org_id: PROFILE.org_id,
      'cognito:groups': ['Borrower'],
    });
  });

  test('buildUser carries id_token as the bearer + org_id/groups in profile', () => {
    const user = buildUser(AUTH_RESULT);
    expect(user.id_token).toBe(ID_TOKEN);
    expect(user.access_token).toBe('access-tok');
    expect(user.refresh_token).toBe('refresh-tok');
    // expires_at prefers the id-token exp claim
    expect(user.expires_at).toBe(PROFILE.exp);
    expect(user.profile.org_id).toBe(PROFILE.org_id);
    expect(user.profile['cognito:groups']).toEqual(['Borrower']);
  });

  test('mintSession calls storeUser AND the stored JSON is what apiClient reads', async () => {
    const stored = {};
    const fakeMgr = {
      storeUser: jest.fn(async (user) => {
        // Emulate oidc-client-ts persistence under the exact apiClient key.
        stored.key = sessionStorageKey();
        stored.value = user.toStorageString();
        sessionStorage.setItem(stored.key, stored.value);
      }),
    };
    __setUserManagerForTest(fakeMgr);

    const user = await mintSession(AUTH_RESULT);

    // storeUser MUST be called (so react-oidc-context adopts the session / silent renew).
    expect(fakeMgr.storeUser).toHaveBeenCalledTimes(1);

    // The persisted entry must round-trip to a user apiClient.getStoredUser would read:
    // key shape `oidc.user:<authority>:<clientId>`, bearer = id_token.
    const raw = sessionStorage.getItem(sessionStorageKey());
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(parsed.id_token).toBe(ID_TOKEN); // apiClient prefers id_token as bearer
    expect(parsed.access_token).toBe('access-tok');
    expect(parsed.refresh_token).toBe('refresh-tok');
    expect(parsed.profile.org_id).toBe(PROFILE.org_id);
    expect(user.id_token).toBe(ID_TOKEN);
  });

  test('sessionStorageKey matches the oidc.user:<authority>:<clientId> shape', () => {
    expect(sessionStorageKey()).toMatch(/^oidc\.user:.+:.+$/);
  });
});
