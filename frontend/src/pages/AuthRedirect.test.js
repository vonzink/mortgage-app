/**
 * AuthRedirect — the `/login` and `/signup` shareable shortcuts.
 *
 * BOTH modes now land on the first-class passwordless page (`/signin`, email OTP).
 * The Cognito Hosted UI is no longer an entry point for either: a borrower who
 * follows an LO's link (or the landing page's "Create account") must get a code,
 * not an AWS username/password form. `buildCognitoSignupUrl` survives in
 * cognitoConfig as break-glass only — nothing routes to it.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthRedirect from './AuthRedirect';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

let mockAuth;
jest.mock('react-oidc-context', () => ({ useAuth: () => mockAuth }));

// The hosted-UI escape hatch still exists in cognitoConfig — assert nothing here
// reaches for it (jsdom won't let us spy on a window.location.href assignment).
const mockSignupUrl = jest.fn(() => 'https://hosted-ui.example/signup');
jest.mock('../auth/cognitoConfig', () => ({
  buildCognitoSignupUrl: (...a) => mockSignupUrl(...a),
}));

const renderAt = (mode) =>
  render(
    <MemoryRouter>
      <AuthRedirect mode={mode} />
    </MemoryRouter>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth = { isLoading: false, isAuthenticated: false };
});

test('signup mode → passwordless /signin (returnTo /apply), never the hosted UI', () => {
  renderAt('signup');
  expect(mockNavigate).toHaveBeenCalledWith('/signin', {
    replace: true,
    state: { returnTo: '/apply' },
  });
  expect(mockSignupUrl).not.toHaveBeenCalled();
});

test('login mode → passwordless /signin (returnTo /applications)', () => {
  renderAt('login');
  expect(mockNavigate).toHaveBeenCalledWith('/signin', {
    replace: true,
    state: { returnTo: '/applications' },
  });
});

test('already authenticated → straight to /applications, no sign-in hop', () => {
  mockAuth = { isLoading: false, isAuthenticated: true };
  renderAt('signup');
  expect(mockNavigate).toHaveBeenCalledWith('/applications', { replace: true });
});

test('still loading → no navigation yet', () => {
  mockAuth = { isLoading: true, isAuthenticated: false };
  renderAt('signup');
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(screen.getByText(/taking you to/i)).toBeInTheDocument();
});
