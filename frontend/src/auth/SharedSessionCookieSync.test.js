import React from 'react';
import { render } from '@testing-library/react';
import SharedSessionCookieSync from './SharedSessionCookieSync';
import { SSO_COOKIE, writeSharedSessionCookie } from './sharedSession';

let mockAuth = { user: null };
jest.mock('react-oidc-context', () => ({
  useAuth: () => mockAuth,
}));

const staffUser = { expired: false, refresh_token: 'rt-1', profile: { 'cognito:groups': ['LO'] } };

afterEach(() => {
  document.cookie = `${SSO_COOKIE}=; Path=/; Max-Age=0`;
});

test('staff session → cookie written on mount', () => {
  mockAuth = { user: staffUser };
  render(<SharedSessionCookieSync />);
  expect(document.cookie).toContain(`${SSO_COOKIE}=`);
});

test('authenticated NON-staff session → clears a pre-existing staff cookie', () => {
  writeSharedSessionCookie(staffUser); // simulate lingering staff cookie
  expect(document.cookie).toContain(`${SSO_COOKIE}=`);
  mockAuth = { user: { expired: false, refresh_token: 'rt-2', profile: { 'cognito:groups': ['Borrower'] } } };
  render(<SharedSessionCookieSync />);
  expect(document.cookie).not.toContain(`${SSO_COOKIE}=`);
});

test('no session → cookie left alone (fresh tab must not kill SSO), renders nothing', () => {
  writeSharedSessionCookie(staffUser);
  mockAuth = { user: null };
  const { container } = render(<SharedSessionCookieSync />);
  expect(container.firstChild).toBeNull();
  expect(document.cookie).toContain(`${SSO_COOKIE}=`);
});

test('expired session → cookie left alone', () => {
  writeSharedSessionCookie(staffUser);
  mockAuth = { user: { ...staffUser, expired: true } };
  render(<SharedSessionCookieSync />);
  expect(document.cookie).toContain(`${SSO_COOKIE}=`);
});

test('silent renew (new user object) → cookie rewritten with the new refresh token', () => {
  mockAuth = { user: { ...staffUser, refresh_token: 'rt-1' } };
  const { rerender } = render(<SharedSessionCookieSync />);
  const first = document.cookie.match(new RegExp(`${SSO_COOKIE}=([^;]*)`))[1];
  mockAuth = { user: { ...staffUser, refresh_token: 'rt-2' } };
  rerender(<SharedSessionCookieSync />);
  const second = document.cookie.match(new RegExp(`${SSO_COOKIE}=([^;]*)`))[1];
  expect(second).not.toBe(first);
  expect(JSON.parse(atob(second)).rt).toBe('rt-2');
});
