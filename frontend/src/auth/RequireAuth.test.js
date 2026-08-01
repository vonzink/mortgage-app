import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RequireAuth from './RequireAuth';

const mockSigninRedirect = jest.fn();
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

let mockAuth;
jest.mock('react-oidc-context', () => ({ useAuth: () => mockAuth }));

const renderGate = () =>
  render(
    <MemoryRouter>
      <RequireAuth><div>protected content</div></RequireAuth>
    </MemoryRouter>,
  );

beforeEach(() => {
  mockSigninRedirect.mockClear();
  mockNavigate.mockClear();
  mockAuth = {
    isLoading: false,
    isAuthenticated: false,
    error: null,
    activeNavigator: null,
    signinRedirect: mockSigninRedirect,
  };
});

afterEach(() => {
  delete process.env.REACT_APP_DEV_SUB;
});

test('dev bypass: renders children and does NOT redirect when REACT_APP_DEV_SUB set', () => {
  process.env.REACT_APP_DEV_SUB = '00000000-0000-0000-0000-0000000000b0';
  renderGate();
  expect(screen.getByText('protected content')).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(mockSigninRedirect).not.toHaveBeenCalled();
});

// The gate is a borrower-facing entry too (a deep link to /apply while signed out),
// so it must route to the passwordless page — NOT kick off the Hosted-UI redirect.
test('no bypass: unauthenticated routes to passwordless /signin and hides children', () => {
  renderGate();
  expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  expect(mockSigninRedirect).not.toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith('/signin', {
    replace: true,
    state: { returnTo: expect.any(String) },
  });
});

test('no bypass: the return destination is the path the user was blocked on', () => {
  window.history.pushState({}, '', '/apply?foo=1');
  renderGate();
  expect(mockNavigate).toHaveBeenCalledWith('/signin', {
    replace: true,
    state: { returnTo: '/apply?foo=1' },
  });
  window.history.pushState({}, '', '/');
});

test('no bypass: authenticated renders children', () => {
  mockAuth.isAuthenticated = true;
  renderGate();
  expect(screen.getByText('protected content')).toBeInTheDocument();
});
