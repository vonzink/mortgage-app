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
  mortgageService.getSuiteApplicationListVersion = jest.fn().mockResolvedValue(null);
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

// ---------------------------------------------------------------------------------------
// Borrower-list version guard (X-Borrower-List-Version). The suite PUT matches
// co-borrowers by position; the header makes it refuse (409 BORROWER_LIST_CHANGED)
// when staff added/deleted/reordered borrowers since this form loaded.
// ---------------------------------------------------------------------------------------
const HEADER = 'X-Borrower-List-Version';
const headerOf = (call) => call[2]?.headers?.[HEADER];
const listChanged = () => Object.assign(new Error('Request failed with status code 409'), {
  response: {
    status: 409,
    data: {
      success: false,
      code: 'BORROWER_LIST_CHANGED',
      message: 'The borrowers on this loan have changed. Reload the application and try again.',
    },
  },
});
const BORROWER_409_MSG = 'Your loan officer updated who is on this application. Nothing was saved — please contact your loan officer before submitting.';

describe('borrower-list version — staff-loan mode', () => {
  it('captures the version from the application GET and sends it on the PUT', async () => {
    mortgageService.getSuiteApplication.mockResolvedValue({ ...suiteApp, borrowerListVersion: 'v-get' });
    sessionStorage.setItem('draft:staff:L9:steps', STEPS_AT_REVIEW);
    renderApply('?loan=L9');
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Loaded this loan's current application"));

    fireEvent.click(screen.getByRole('button', { name: /save to loan/i }));

    await waitFor(() => expect(suiteClient.put).toHaveBeenCalledTimes(1));
    expect(headerOf(suiteClient.put.mock.calls[0])).toBe('v-get');
    // The full GET already carried it — no extra version GET.
    expect(mortgageService.getSuiteApplicationListVersion).not.toHaveBeenCalled();
  });

  it('omits the header when no version is known', async () => {
    sessionStorage.setItem('draft:staff:L9:steps', STEPS_AT_REVIEW);
    renderApply('?loan=L9');
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Loaded this loan's current application"));

    fireEvent.click(screen.getByRole('button', { name: /save to loan/i }));

    await waitFor(() => expect(suiteClient.put).toHaveBeenCalledTimes(1));
    expect(suiteClient.put.mock.calls[0]).toHaveLength(2);
  });

  it('replaces the version with the one in each successful PUT response', async () => {
    mortgageService.getSuiteApplication.mockResolvedValue({ ...suiteApp, borrowerListVersion: 'v-get' });
    suiteClient.put
      .mockResolvedValueOnce({ data: { success: true, data: { borrowerListVersion: 'v-put1' } } })
      .mockResolvedValueOnce({ data: { success: true, data: { borrowerListVersion: 'v-put2' } } });
    sessionStorage.setItem('draft:staff:L9:steps', STEPS_AT_REVIEW);
    renderApply('?loan=L9');
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Loaded this loan's current application"));

    fireEvent.click(screen.getByRole('button', { name: /save to loan/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /save to loan/i }));
    await waitFor(() => expect(suiteClient.put).toHaveBeenCalledTimes(2));

    expect(headerOf(suiteClient.put.mock.calls[0])).toBe('v-get');
    expect(headerOf(suiteClient.put.mock.calls[1])).toBe('v-put1');
    // Success clears the draft, and the version stored with it.
    expect(sessionStorage.getItem('draft:staff:L9:listVersion')).toBeNull();
  });

  it('a restored draft sends the version it started with (no version GET)', async () => {
    sessionStorage.setItem('draft:staff:L9', JSON.stringify({ borrowers: [{ firstName: 'Draftina' }] }));
    sessionStorage.setItem('draft:staff:L9:listVersion', JSON.stringify({ loanId: 'L9', version: 'v-draft' }));
    sessionStorage.setItem('draft:staff:L9:steps', STEPS_AT_REVIEW);
    renderApply('?loan=L9');
    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith('Restored your in-progress draft for this loan'));

    fireEvent.click(screen.getByRole('button', { name: /save to loan/i }));

    await waitFor(() => expect(suiteClient.put).toHaveBeenCalledTimes(1));
    expect(headerOf(suiteClient.put.mock.calls[0])).toBe('v-draft');
    expect(mortgageService.getSuiteApplicationListVersion).not.toHaveBeenCalled();
    expect(mortgageService.getSuiteApplication).not.toHaveBeenCalled();
  });

  it('an older draft with no stored version captures the current version at open without overwriting the form', async () => {
    mortgageService.getSuiteApplicationListVersion.mockResolvedValue('v-open');
    sessionStorage.setItem('draft:staff:L9', JSON.stringify({ borrowers: [{ firstName: 'Draftina' }] }));
    sessionStorage.setItem('draft:staff:L9:steps', STEPS_AT_REVIEW);
    renderApply('?loan=L9');
    await waitFor(() => expect(mortgageService.getSuiteApplicationListVersion).toHaveBeenCalledWith('L9'));
    await waitFor(() =>
      expect(JSON.parse(sessionStorage.getItem('draft:staff:L9:listVersion'))).toEqual({ loanId: 'L9', version: 'v-open' }));
    expect(mortgageService.getSuiteApplication).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /save to loan/i }));

    await waitFor(() => expect(suiteClient.put).toHaveBeenCalledTimes(1));
    expect(headerOf(suiteClient.put.mock.calls[0])).toBe('v-open');
    expect(suiteClient.put.mock.calls[0][1].borrower.firstName).toBe('Draftina');
  });

  it('409 BORROWER_LIST_CHANGED: nothing saved, draft kept, explains + offers Reload', async () => {
    const draft = JSON.stringify({ borrowers: [{ firstName: 'Draftina' }] });
    sessionStorage.setItem('draft:staff:L9', draft);
    sessionStorage.setItem('draft:staff:L9:listVersion', JSON.stringify({ loanId: 'L9', version: 'v-old' }));
    sessionStorage.setItem('draft:staff:L9:steps', STEPS_AT_REVIEW);
    suiteClient.put.mockRejectedValue(listChanged());
    renderApply('?loan=L9');
    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith('Restored your in-progress draft for this loan'));

    fireEvent.click(screen.getByRole('button', { name: /save to loan/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.success).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('draft:staff:L9')).toContain('Draftina');
    expect(sessionStorage.getItem('draft:staff:L9:listVersion')).not.toBeNull();

    // The toast content explains the refusal and carries a Reload action.
    const [content] = toast.error.mock.calls[0];
    expect(typeof content).not.toBe('string');
    render(content);
    expect(screen.getByText(/nothing was saved/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });

  it('Reload discards the draft and its version and loads fresh from the suite', async () => {
    sessionStorage.setItem('draft:staff:L9', JSON.stringify({ borrowers: [{ firstName: 'Draftina' }] }));
    sessionStorage.setItem('draft:staff:L9:listVersion', JSON.stringify({ loanId: 'L9', version: 'v-old' }));
    sessionStorage.setItem('draft:staff:L9:steps', STEPS_AT_REVIEW);
    suiteClient.put.mockRejectedValueOnce(listChanged());
    mortgageService.getSuiteApplication.mockResolvedValue({ ...suiteApp, borrowerListVersion: 'v-new' });
    renderApply('?loan=L9');
    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith('Restored your in-progress draft for this loan'));

    fireEvent.click(screen.getByRole('button', { name: /save to loan/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(suiteClient.put.mock.calls[0][1].borrower.firstName).toBe('Draftina');

    const { unmount } = render(toast.error.mock.calls[0][0]);
    fireEvent.click(screen.getByRole('button', { name: /reload/i }));
    unmount();
    // Draft and its stored version are discarded straight away.
    expect(sessionStorage.getItem('draft:staff:L9')).toBeNull();

    await waitFor(() => expect(mortgageService.getSuiteApplication).toHaveBeenCalledWith('L9'));
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Loaded this loan's current application"));
    expect(JSON.parse(sessionStorage.getItem('draft:staff:L9:listVersion'))).toEqual({ loanId: 'L9', version: 'v-new' });

    // The next save carries the fresh suite data and the fresh version.
    fireEvent.click(screen.getByRole('button', { name: /save to loan/i }));
    await waitFor(() => expect(suiteClient.put).toHaveBeenCalledTimes(2));
    expect(headerOf(suiteClient.put.mock.calls[1])).toBe('v-new');
    expect(suiteClient.put.mock.calls[1][1].borrower.firstName).toBe('Ada');
  });

  it('other errors behave as before (server message wins)', async () => {
    sessionStorage.setItem('draft:staff:L9:steps', STEPS_AT_REVIEW);
    suiteClient.put.mockRejectedValue(Object.assign(new Error('409'), {
      response: { status: 409, data: { success: false, code: 'CONFLICT', message: 'Conflicting resource state' } },
    }));
    renderApply('?loan=L9');
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Loaded this loan's current application"));

    fireEvent.click(screen.getByRole('button', { name: /save to loan/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Conflicting resource state', { autoClose: 5000 }));
  });
});

describe('borrower-list version — borrower self-submit', () => {
  beforeEach(() => {
    mockRoles = { isStaff: false, isBorrower: true };
  });

  it('continuing a loan: one version GET at open (no prefill) and the PUT sends it', async () => {
    mortgageService.getSuiteApplicationListVersion.mockResolvedValue('v-open');
    sessionStorage.setItem('suiteLoanId', 'SL1');
    sessionStorage.setItem('draft:new:steps', STEPS_AT_REVIEW);
    renderApply('');
    await waitFor(() =>
      expect(mortgageService.getSuiteApplicationListVersion).toHaveBeenCalledWith('SL1'));
    await waitFor(() => expect(sessionStorage.getItem('draft:new:listVersion')).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() => expect(suiteClient.put).toHaveBeenCalledTimes(1));
    expect(headerOf(suiteClient.put.mock.calls[0])).toBe('v-open');
    expect(mortgageService.getSuiteApplicationListVersion).toHaveBeenCalledTimes(1);
    expect(mortgageService.getSuiteApplication).not.toHaveBeenCalled();
  });

  it('a restored borrower draft keeps the version it started with', async () => {
    mortgageService.getSuiteApplicationListVersion.mockResolvedValue('v-now');
    sessionStorage.setItem('suiteLoanId', 'SL1');
    sessionStorage.setItem('draft:new', JSON.stringify({ borrowers: [{ firstName: 'Bo' }] }));
    sessionStorage.setItem('draft:new:listVersion', JSON.stringify({ loanId: 'SL1', version: 'v-draft' }));
    sessionStorage.setItem('draft:new:steps', STEPS_AT_REVIEW);
    renderApply('');

    fireEvent.click(await screen.findByRole('button', { name: /submit application/i }));

    await waitFor(() => expect(suiteClient.put).toHaveBeenCalledTimes(1));
    expect(headerOf(suiteClient.put.mock.calls[0])).toBe('v-draft');
    expect(mortgageService.getSuiteApplicationListVersion).not.toHaveBeenCalled();
  });

  it('a new loan (created by intake) sends no header on its first PUT', async () => {
    mortgageService.createLoanFromIntake.mockResolvedValue({ loanId: 'NEW1' });
    // A version stored for some OTHER loan must never be sent against the new one.
    sessionStorage.setItem('draft:new:listVersion', JSON.stringify({ loanId: 'OLD', version: 'v-old' }));
    sessionStorage.setItem('draft:new:steps', STEPS_AT_REVIEW);
    renderApply('');

    fireEvent.click(await screen.findByRole('button', { name: /submit application/i }));

    await waitFor(() => expect(suiteClient.put).toHaveBeenCalledTimes(1));
    expect(suiteClient.put.mock.calls[0][0]).toBe('/loans/NEW1/application');
    expect(suiteClient.put.mock.calls[0]).toHaveLength(2);
    expect(mortgageService.getSuiteApplicationListVersion).not.toHaveBeenCalled();
  });

  it('409 BORROWER_LIST_CHANGED: tells the borrower to contact their LO; nothing cleared', async () => {
    mortgageService.getSuiteApplicationListVersion.mockResolvedValue('v-open');
    suiteClient.put.mockRejectedValue(listChanged());
    const draft = JSON.stringify({ borrowers: [{ firstName: 'Bo' }] });
    sessionStorage.setItem('suiteLoanId', 'SL1');
    sessionStorage.setItem('draft:new', draft);
    sessionStorage.setItem('draft:new:steps', STEPS_AT_REVIEW);
    renderApply('');
    await waitFor(() => expect(sessionStorage.getItem('draft:new:listVersion')).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.error.mock.calls[0][0]).toBe(BORROWER_409_MSG);
    expect(toast.success).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('draft:new')).toContain('"Bo"');
    expect(sessionStorage.getItem('draft:new:listVersion')).not.toBeNull();
    expect(sessionStorage.getItem('suiteLoanId')).toBe('SL1');
  });
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
