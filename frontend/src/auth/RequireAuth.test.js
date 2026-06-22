import React from 'react';
import { render, screen } from '@testing-library/react';
import RequireAuth from './RequireAuth';

const mockSigninRedirect = jest.fn();
let mockAuth;
jest.mock('react-oidc-context', () => ({ useAuth: () => mockAuth }));

beforeEach(() => {
  mockSigninRedirect.mockClear();
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
  render(<RequireAuth><div>protected content</div></RequireAuth>);
  expect(screen.getByText('protected content')).toBeInTheDocument();
  expect(mockSigninRedirect).not.toHaveBeenCalled();
});

test('no bypass: unauthenticated triggers signinRedirect and hides children', () => {
  render(<RequireAuth><div>protected content</div></RequireAuth>);
  expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  expect(mockSigninRedirect).toHaveBeenCalled();
});

test('no bypass: authenticated renders children', () => {
  mockAuth.isAuthenticated = true;
  render(<RequireAuth><div>protected content</div></RequireAuth>);
  expect(screen.getByText('protected content')).toBeInTheDocument();
});
