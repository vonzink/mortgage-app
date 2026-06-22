import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ContinuePage from './ContinuePage';
import mortgageService from '../services/mortgageService';

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

// ── passwordless auth ────────────────────────────────────────────────────────
// Use module-level jest.fn() so we can assert call counts. The factory must not
// close over the variable value at hoist time, so we re-read it each call.
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
  // fresh auth instance per test so we get fresh jest.fn() spies
  mockAuthInstance = {
    kind: 'dev',
    requestCode: jest.fn().mockResolvedValue({ sent: true }),
    verifyCode: jest.fn().mockResolvedValue({ ok: true }),
  };
});

test('greets the borrower and shows the captured summary', () => {
  renderPage();
  expect(screen.getByText(/Welcome, Ann/i)).toBeInTheDocument();
  expect(screen.getByText(/Zachary Zink/i)).toBeInTheDocument();
  expect(screen.getByText(/\$425,000/)).toBeInTheDocument();
});

test('createLoanFromIntake failure resets phase to code so user can retry', async () => {
  mortgageService.createLoanFromIntake.mockRejectedValueOnce(new Error('network error'));
  renderPage();

  // advance to code phase
  fireEvent.click(screen.getByRole('button', { name: /code/i }));
  await waitFor(() => screen.getByLabelText(/^code$/i));

  // enter code and attempt verify
  fireEvent.change(screen.getByLabelText(/^code$/i), { target: { value: '000000' } });
  fireEvent.click(screen.getByRole('button', { name: /verify|continue/i }));

  await waitFor(() => expect(mortgageService.createLoanFromIntake).toHaveBeenCalled());

  // auth card must be re-shown (phase reset to 'code')
  expect(screen.getByLabelText(/^code$/i)).toBeInTheDocument();
  // must NOT have navigated away
  expect(mockNavigate).not.toHaveBeenCalledWith('/apply');
});

test('email -> request code -> verify -> creates loan, seeds carryOverData, navigates to /apply', async () => {
  renderPage();

  // Phase 1: click "Email me a 6-digit code"
  fireEvent.click(screen.getByRole('button', { name: /code/i }));
  await waitFor(() => expect(mockAuthInstance.requestCode).toHaveBeenCalledWith('ann@example.com'));

  // Phase 2: code input appears; enter code and verify
  await waitFor(() => screen.getByLabelText(/^code$/i));
  fireEvent.change(screen.getByLabelText(/^code$/i), { target: { value: '000000' } });
  fireEvent.click(screen.getByRole('button', { name: /verify|continue/i }));

  await waitFor(() => expect(mockAuthInstance.verifyCode).toHaveBeenCalled());
  await waitFor(() => expect(mortgageService.createLoanFromIntake).toHaveBeenCalled());
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/apply'));
  expect(JSON.parse(sessionStorage.getItem('carryOverData')).borrowers[0].firstName).toBe('Ann');
});
