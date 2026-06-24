import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ContinuePage from './ContinuePage';
import mortgageService from '../services/mortgageService';
import { Factor } from '../auth/passwordless/factors';

// ── navigation ──────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// ── mortgageService ──────────────────────────────────────────────────────────
jest.mock('../services/mortgageService', () => ({
  __esModule: true,
  default: {
    createLoanFromIntake: jest.fn().mockResolvedValue({ loanId: 'L1', loanNumber: '100' }),
  },
}));

// ── passwordless auth (widened contract: availableFactors/start/respond) ──────
let mockAuthInstance;
jest.mock('../auth/passwordless/PasswordlessAuthPort', () => ({
  getPasswordlessAuth: () => mockAuthInstance,
}));

// ── token ────────────────────────────────────────────────────────────────────
const TOKEN = (() => {
  const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64({
    h: {
      sourceLeadId: 'lead-1',
      loanPurpose: 'Purchase',
      borrower: { firstName: 'Ann', lastName: 'Buyer', email: 'ann@example.com', phone: '5' },
      property: { propertyUse: 'Primary residence' },
      display: { purchasePrice: 425000 },
      loanOfficer: { name: 'Zachary Zink', slug: 'z' },
    },
  })}.sig`;
})();

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/continue?t=${TOKEN}`]}>
      <ContinuePage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  sessionStorage.clear();
  mockNavigate.mockClear();
  mortgageService.createLoanFromIntake.mockClear();
  // fresh auth instance per test so we get fresh jest.fn() spies (email-only so the
  // chooser defaults to EMAIL_OTP and exposes the OTP code path).
  mockAuthInstance = {
    kind: 'dev',
    availableFactors: jest.fn(() => [Factor.EMAIL_OTP]),
    start: jest.fn(async (username, factor) => ({
      kind: 'otp',
      factor,
      username,
      session: 'sess',
      destination: username,
    })),
    respond: jest.fn(async () => ({ user: { kind: 'dev' } })),
  };
});

test('greets the borrower and shows the captured summary', () => {
  renderPage();
  expect(screen.getByText(/Welcome, Ann/i)).toBeInTheDocument();
  expect(screen.getByText(/Zachary Zink/i)).toBeInTheDocument();
  expect(screen.getByText(/\$425,000/)).toBeInTheDocument();
});

test('createLoanFromIntake failure resets to the chooser so user can retry', async () => {
  mortgageService.createLoanFromIntake.mockRejectedValueOnce(new Error('network error'));
  renderPage();

  // Start the email-OTP factor → code entry appears.
  fireEvent.click(screen.getByRole('button', { name: /email me a code/i }));
  const codeInput = await screen.findByLabelText(/enter the 6-digit code/i);

  fireEvent.change(codeInput, { target: { value: '000000' } });
  fireEvent.click(screen.getByRole('button', { name: /verify/i }));

  await waitFor(() => expect(mortgageService.createLoanFromIntake).toHaveBeenCalled());

  // The factor chooser must be re-shown (working state cleared) and no /apply nav.
  expect(await screen.findByLabelText(/^email$/i)).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalledWith('/apply');
});

test('email -> start -> respond -> creates loan, seeds carryOverData, navigates to /apply', async () => {
  renderPage();

  // Start the email-OTP factor (username = prefilled email).
  fireEvent.click(screen.getByRole('button', { name: /email me a code/i }));
  await waitFor(() =>
    expect(mockAuthInstance.start).toHaveBeenCalledWith('ann@example.com', Factor.EMAIL_OTP)
  );

  // Code input appears; enter it and verify.
  const codeInput = await screen.findByLabelText(/enter the 6-digit code/i);
  fireEvent.change(codeInput, { target: { value: '000000' } });
  fireEvent.click(screen.getByRole('button', { name: /verify/i }));

  await waitFor(() => expect(mockAuthInstance.respond).toHaveBeenCalled());
  await waitFor(() => expect(mortgageService.createLoanFromIntake).toHaveBeenCalled());
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/apply'));
  expect(JSON.parse(sessionStorage.getItem('carryOverData')).borrowers[0].firstName).toBe('Ann');
});
