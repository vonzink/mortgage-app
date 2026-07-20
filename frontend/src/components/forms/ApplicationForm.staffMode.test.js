/**
 * ApplicationForm STAFF-LOAN MODE (?loan=<suiteLoanId>) — Task 13.
 *
 * A staff member (LO/Processor/Admin/Manager) opens /apply?loan=L9 from client-view:
 *  - the loan's CURRENT application is loaded from the suite (GET /loans/{id}/application
 *    via mortgageService.getSuiteApplication) and reset into the wizard;
 *  - submit PUTs straight onto that loan (never intake-creates) and returns to
 *    /client-view/{loanId};
 *  - drafts key by the loan (draft:staff:L9) and carryOverData is ignored;
 *  - SSN pin: the suite GET never returns the SSN, so the form field is blank and the
 *    wire body MUST carry borrower.ssn === null (the suite's applyPii KEEPS the stored
 *    SSN on null; an empty string would 400 the whole PUT).
 *
 * The wizard's heavy step/chrome children are stubbed — the mode wiring is under test,
 * not the steps.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { toast } from 'react-toastify';
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

// useRoles mocked via a mutable box so each test can flip staff/borrower.
let mockRoles = { isStaff: true, isBorrower: false };
jest.mock('../../hooks/useRoles', () => () => mockRoles);

jest.mock('../../services/mortgageService');
jest.mock('../../services/apiClient', () => ({
  suiteClient: { get: jest.fn(), put: jest.fn(), post: jest.fn() },
}));

// Step + chrome stubs. LoanInformationStep (step 1) surfaces the primary borrower's
// first name via the form's watch so the load tests can see reset() take effect.
jest.mock('./LoanInformationStep', () => {
  const React = require('react');
  return (props) =>
    React.createElement(
      'div',
      { 'data-testid': 'step-1' },
      React.createElement(
        'span',
        { 'data-testid': 'primary-first-name' },
        props.watch('borrowers.0.firstName') || '',
      ),
    );
});
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
    ApplyHero: ({ onSaveAndExit }) =>
      onSaveAndExit
        ? React.createElement('button', { type: 'button', onClick: onSaveAndExit }, 'save-exit')
        : null,
    // The strip's Continue/Submit CTA is the submit trigger on the last step.
    ApplyProgressStrip: ({ onContinue, continueLabel }) =>
      React.createElement(
        'button',
        { type: 'button', onClick: onContinue || undefined },
        continueLabel || 'continue',
      ),
  };
});

const suiteApp = {
  loanId: 'L9',
  loanNumber: '3001',
  borrowerId: 'B1',
  loan: {
    mortgageType: 'CONVENTIONAL',
    baseLoanAmount: 350000,
    addressLine1: '9 Main St',
    city: 'Denver',
    state: 'CO',
    postalCode: '80202',
    propertyType: 'SINGLE_FAMILY',
    occupancyType: 'PRIMARY_RESIDENCE',
  },
  // What the suite GET returns TODAY: display fields + hasSsn, NEVER the SSN itself.
  borrower: {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@x.com',
    cellPhone: '3035551000',
    hasSsn: true,
  },
};

const STEPS_AT_REVIEW = JSON.stringify({ step: 7, visited: [1, 2, 3, 4, 5, 6, 7] });

function renderApply(query) {
  return render(
    <MemoryRouter initialEntries={[`/apply${query}`]}>
      <Routes>
        <Route path="/apply" element={<ApplicationForm />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
  jest.clearAllMocks();
  mockRoles = { isStaff: true, isBorrower: false };
  mortgageService.getSuiteApplication = jest.fn().mockResolvedValue(suiteApp);
  mortgageService.createLoanFromIntake = jest.fn();
  suiteClient.put.mockResolvedValue({ data: { success: true, data: {} } });
});

it('staff ?loan= mode loads the suite application into the wizard', async () => {
  renderApply('?loan=L9');
  await waitFor(() => expect(mortgageService.getSuiteApplication).toHaveBeenCalledWith('L9'));
  await waitFor(() => expect(screen.getByTestId('primary-first-name')).toHaveTextContent('Ada'));
  expect(toast.info).toHaveBeenCalledWith("Loaded this loan's current application");
});

it('staff submit PUTs onto the suite loan (no intake-create) and returns to client-view; blank SSN goes out null', async () => {
  sessionStorage.setItem('draft:staff:L9:steps', STEPS_AT_REVIEW);
  renderApply('?loan=L9');
  await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Loaded this loan's current application"));

  fireEvent.click(screen.getByRole('button', { name: /save to loan/i }));

  await waitFor(() => expect(suiteClient.put).toHaveBeenCalledTimes(1));
  const [url, body] = suiteClient.put.mock.calls[0];
  expect(url).toBe('/loans/L9/application');
  expect(body.borrower.firstName).toBe('Ada');
  // SSN keep-on-file pin: the GET never returned the SSN, so the form field is blank
  // and the wire MUST be null (suite applyPii keeps the stored SSN; '' would 400).
  expect(body.borrower.ssn).toBeNull();

  expect(mortgageService.createLoanFromIntake).not.toHaveBeenCalled();
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/client-view/L9'), { timeout: 2000 });
  expect(toast.success).toHaveBeenCalledWith('Application saved to the loan!');
  // Drafts for this loan were cleared on success.
  expect(sessionStorage.getItem('draft:staff:L9')).toBeNull();
  expect(sessionStorage.getItem('draft:staff:L9:steps')).toBeNull();
});

it('staff ?loan= mode wins over a stale stashed borrower suiteLoanId', async () => {
  sessionStorage.setItem('suiteLoanId', 'SL1');
  sessionStorage.setItem('draft:staff:L9:steps', STEPS_AT_REVIEW);
  renderApply('?loan=L9');
  await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Loaded this loan's current application"));

  fireEvent.click(screen.getByRole('button', { name: /save to loan/i }));

  await waitFor(() => expect(suiteClient.put).toHaveBeenCalledTimes(1));
  expect(suiteClient.put.mock.calls[0][0]).toBe('/loans/L9/application');
  // The borrower stash is NOT consumed by a staff save.
  expect(sessionStorage.getItem('suiteLoanId')).toBe('SL1');
});

it('a restored staff draft WINS over the server load (no reset-clobber)', async () => {
  // A draft is, by construction, NEWER than the server state — the staff member was
  // mid-edit when they left. The load effect must not clobber it.
  sessionStorage.setItem('draft:staff:L9', JSON.stringify({ borrowers: [{ firstName: 'Draftina' }] }));
  renderApply('?loan=L9');
  await waitFor(() =>
    expect(toast.info).toHaveBeenCalledWith('Restored your in-progress draft for this loan'));
  expect(screen.getByTestId('primary-first-name')).toHaveTextContent('Draftina');
  expect(mortgageService.getSuiteApplication).not.toHaveBeenCalled();
  expect(toast.info).not.toHaveBeenCalledWith("Loaded this loan's current application");
});

it('a failed/empty staff load warns and stays on the blank wizard', async () => {
  // getSuiteApplication swallows fetch errors to null, so null = "nothing to load OR
  // the fetch failed" — say so neutrally and keep the blank form (a valid use case).
  mortgageService.getSuiteApplication.mockResolvedValue(null);
  renderApply('?loan=L9');
  await waitFor(() =>
    expect(toast.warn).toHaveBeenCalledWith('Could not load an existing application — starting blank'));
  expect(toast.info).not.toHaveBeenCalledWith("Loaded this loan's current application");
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(screen.getByTestId('primary-first-name').textContent).toBe('');
});

it('staff Save & Exit returns to client-view with neutral copy', async () => {
  renderApply('?loan=L9');
  await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Loaded this loan's current application"));
  fireEvent.click(screen.getByRole('button', { name: /save-exit/i }));
  expect(toast.info).toHaveBeenCalledWith('Draft saved on this device.');
  expect(mockNavigate).toHaveBeenCalledWith('/client-view/L9');
});

it('a non-staff user with ?loan stays OUT of staff mode (borrower path, no staff PUT)', async () => {
  mockRoles = { isStaff: false, isBorrower: true };
  sessionStorage.setItem('suiteLoanId', 'SL1');
  // draftKey keys off ?loan PRESENCE (not role), so the steps key is still draft:staff:L9:steps.
  sessionStorage.setItem('draft:staff:L9:steps', STEPS_AT_REVIEW);
  renderApply('?loan=L9');

  fireEvent.click(await screen.findByRole('button', { name: /submit application/i }));

  await waitFor(() => expect(suiteClient.put).toHaveBeenCalledTimes(1));
  expect(suiteClient.put.mock.calls[0][0]).toBe('/loans/SL1/application');
  expect(mortgageService.getSuiteApplication).not.toHaveBeenCalled();
  expect(mortgageService.createLoanFromIntake).not.toHaveBeenCalled();
  await waitFor(
    () => expect(mockNavigate).toHaveBeenCalledWith('/application-submitted', expect.anything()),
    { timeout: 2500 },
  );
});

it('staff mode ignores carryOverData and keys drafts by the loan', async () => {
  sessionStorage.setItem('carryOverData', JSON.stringify({ borrowers: [{ firstName: 'Carry' }] }));
  renderApply('?loan=L9');
  await waitFor(() => expect(screen.getByTestId('primary-first-name')).toHaveTextContent('Ada'));
  // carry-over NOT consumed (guarded off in staff-loan mode)…
  expect(sessionStorage.getItem('carryOverData')).not.toBeNull();
  expect(toast.info).not.toHaveBeenCalledWith('All data loaded from previous application');
  // …and step/draft state keys by the staff loan.
  expect(sessionStorage.getItem('draft:staff:L9:steps')).not.toBeNull();
});

it('borrower self-submit path is untouched: PUTs to the stashed suite loan and lands on /application-submitted', async () => {
  mockRoles = { isStaff: false, isBorrower: true };
  sessionStorage.setItem('suiteLoanId', 'SL1');
  sessionStorage.setItem('draft:new:steps', STEPS_AT_REVIEW);
  renderApply('');

  fireEvent.click(await screen.findByRole('button', { name: /submit application/i }));

  await waitFor(() => expect(suiteClient.put).toHaveBeenCalledTimes(1));
  expect(suiteClient.put.mock.calls[0][0]).toBe('/loans/SL1/application');
  expect(mortgageService.getSuiteApplication).not.toHaveBeenCalled();
  await waitFor(
    () => expect(mockNavigate).toHaveBeenCalledWith('/application-submitted', expect.anything()),
    { timeout: 2500 },
  );
});
