/**
 * LandingPage auth CTAs — both must enter the passwordless funnel.
 *
 * "Create an account" used to hard-navigate to the Cognito Hosted UI signup form
 * (username + password). Every borrower-facing entry now goes to /signin, where
 * the OTP adapter self-SignUps a brand-new email before emailing the code.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './LandingPage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

let mockAuth;
jest.mock('react-oidc-context', () => ({ useAuth: () => mockAuth }));
jest.mock('../hooks/useRoles', () => () => ({ isStaff: false }));

// jsdom won't let us spy on `window.location.href =`, so pin the stronger claim:
// the hosted-UI URL builder is never reached from either CTA.
const mockSignupUrl = jest.fn(() => 'https://hosted-ui.example/signup');
jest.mock('../auth/cognitoConfig', () => ({
  buildCognitoSignupUrl: (...a) => mockSignupUrl(...a),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth = { isAuthenticated: false, user: null };
});

const renderLanding = () =>
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );

test('"Create an account" → passwordless /signin heading for /apply (no hosted UI)', () => {
  renderLanding();
  fireEvent.click(screen.getByRole('button', { name: /create an account/i }));
  expect(mockNavigate).toHaveBeenCalledWith('/signin', { state: { returnTo: '/apply' } });
  expect(mockSignupUrl).not.toHaveBeenCalled();
});

test('"Sign in" → passwordless /signin heading for /applications', () => {
  renderLanding();
  fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
  expect(mockNavigate).toHaveBeenCalledWith('/signin', { state: { returnTo: '/applications' } });
});
