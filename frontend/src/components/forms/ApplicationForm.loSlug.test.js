/**
 * ApplicationForm — LO-attribution carry (sessionStorage 'loSlug') — Task 14.
 *
 * A prospect who entered via /lo/:slug has the slug stashed in sessionStorage.
 * When the borrower self-submit path MATERIALIZES a loan (no stashed suiteLoanId
 * → POST /loans/intake via createLoanFromIntake), the intake body must carry
 * `loSlug` so the suite attributes the LO. After a successful submit the stash
 * is consumed (removed). Absent stash → no loSlug key at all.
 *
 * Harness mirrors ApplicationForm.staffMode.test.js (steps/chrome stubbed).
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ApplicationForm from './ApplicationForm';
import mortgageService from '../../services/mortgageService';
import { suiteClient } from '../../services/apiClient';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('react-toastify', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

let mockRoles = { isStaff: false, isBorrower: true };
jest.mock('../../hooks/useRoles', () => () => mockRoles);

jest.mock('../../services/mortgageService');
jest.mock('../../services/apiClient', () => ({
  suiteClient: { get: jest.fn(), put: jest.fn(), post: jest.fn() },
}));

jest.mock('./LoanInformationStep', () => () => null);
jest.mock('./BorrowerInformationStep', () => () => null);
jest.mock('./PropertyDetailsStep', () => () => null);
jest.mock('./EmploymentStep', () => () => null);
jest.mock('./AssetsLiabilitiesStep', () => () => null);
jest.mock('./DeclarationsStep', () => () => null);
jest.mock('./ReviewSubmitStep', () => () => null);
jest.mock('../shared/StepNavigation', () => () => null);
jest.mock('../assistant/AskAiWidget', () => () => null);
jest.mock('../design/ApplyChrome', () => {
  const React = require('react');
  return {
    ApplyHero: () => null,
    ApplyProgressStrip: ({ onContinue, continueLabel }) =>
      React.createElement(
        'button',
        { type: 'button', onClick: onContinue || undefined },
        continueLabel || 'continue',
      ),
  };
});

const STEPS_AT_REVIEW = JSON.stringify({ step: 7, visited: [1, 2, 3, 4, 5, 6, 7] });

function renderApply() {
  return render(
    <MemoryRouter initialEntries={['/apply']}>
      <Routes>
        <Route path="/apply" element={<ApplicationForm />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
  jest.clearAllMocks();
  mockRoles = { isStaff: false, isBorrower: true };
  mortgageService.createLoanFromIntake = jest.fn().mockResolvedValue({ loanId: 'NEW1' });
  mortgageService.getSuiteApplication = jest.fn();
  suiteClient.put.mockResolvedValue({ data: { success: true, data: {} } });
  // Borrower self-materialize path: NO stashed suiteLoanId → intake-create fires.
  sessionStorage.setItem('draft:new:steps', STEPS_AT_REVIEW);
});

it('stashed loSlug rides the intake body and is cleared after a successful submit', async () => {
  sessionStorage.setItem('loSlug', 'zack-zink');
  renderApply();

  fireEvent.click(await screen.findByRole('button', { name: /submit application/i }));

  await waitFor(() => expect(mortgageService.createLoanFromIntake).toHaveBeenCalledTimes(1));
  const intakeBody = mortgageService.createLoanFromIntake.mock.calls[0][0];
  expect(intakeBody.loSlug).toBe('zack-zink');

  // Save proceeded onto the materialized loan…
  await waitFor(() => expect(suiteClient.put).toHaveBeenCalledTimes(1));
  expect(suiteClient.put.mock.calls[0][0]).toBe('/loans/NEW1/application');
  // …and the successful submit consumed the stash.
  await waitFor(() => expect(sessionStorage.getItem('loSlug')).toBeNull());
});

it('no stashed loSlug → intake body has NO loSlug key', async () => {
  renderApply();

  fireEvent.click(await screen.findByRole('button', { name: /submit application/i }));

  await waitFor(() => expect(mortgageService.createLoanFromIntake).toHaveBeenCalledTimes(1));
  const intakeBody = mortgageService.createLoanFromIntake.mock.calls[0][0];
  expect('loSlug' in intakeBody).toBe(false);
});

it('a FAILED submit keeps the loSlug stash (retry still attributes)', async () => {
  sessionStorage.setItem('loSlug', 'zack-zink');
  suiteClient.put.mockRejectedValue(new Error('boom'));
  renderApply();

  fireEvent.click(await screen.findByRole('button', { name: /submit application/i }));

  await waitFor(() => expect(suiteClient.put).toHaveBeenCalled());
  expect(sessionStorage.getItem('loSlug')).toBe('zack-zink');
});
