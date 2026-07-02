process.env.REACT_APP_COGNITO_CLIENT_ID = process.env.REACT_APP_COGNITO_CLIENT_ID || 'test-client-id';

import {
  SSO_COOKIE,
  isStaffProfile,
  cookieDomainAttrFor,
  writeSharedSessionCookie,
  clearSharedSessionCookie,
} from './sharedSession';

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

  test('clearSharedSessionCookie removes it', () => {
    writeSharedSessionCookie(staffUser());
    clearSharedSessionCookie();
    expect(document.cookie).not.toContain(`${SSO_COOKIE}=ey`);
  });
});
