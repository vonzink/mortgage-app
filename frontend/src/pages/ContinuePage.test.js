import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ContinuePage from './ContinuePage';
import mortgageService from '../services/mortgageService';
import { Factor } from '../auth/passwordless/factors';

// ── navigation ──────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

// ── window.location.assign — the REAL-Cognito hard-nav target (regression guard) ─
// The prod path MUST hard-navigate (storeUser doesn't raise userLoaded → a SPA
// navigate would leave isAuthenticated=false → RequireAuth bounces to hosted UI).
// REACT_APP_DEV_SUB is unset under test, so finishAndContinue takes the prod branch.
const mockAssign = vi.fn();
Object.defineProperty(window, 'location', {
  configurable: true,
  value: { assign: mockAssign, href: 'http://localhost/' },
});

// ── mortgageService ──────────────────────────────────────────────────────────
vi.mock('../services/mortgageService', () => ({
  __esModule: true,
  default: {
    createLoanFromIntake: vi.fn().mockResolvedValue({ loanId: 'L1', loanNumber: '100' }),
  },
}));

// ── passwordless auth (widened contract: availableFactors/start/respond) ──────
let mockAuthInstance;
vi.mock('../auth/passwordless/PasswordlessAuthPort', () => ({
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
  mockAssign.mockClear();
  mortgageService.createLoanFromIntake.mockClear();
  // .env sets REACT_APP_DEV_SUB for local dev; delete it so each test exercises the
  // PROD (hard-nav) branch by default. The dev-path test sets it back explicitly.
  delete process.env.REACT_APP_DEV_SUB;
  // fresh auth instance per test so we get fresh vi.fn() spies (email-only so the
  // chooser defaults to EMAIL_OTP and exposes the OTP code path).
  mockAuthInstance = {
    kind: 'dev',
    availableFactors: vi.fn(() => [Factor.EMAIL_OTP]),
    start: vi.fn(async (username, factor) => ({
      kind: 'otp',
      factor,
      username,
      session: 'sess',
      destination: username,
    })),
    respond: vi.fn(async () => ({ user: { kind: 'dev' } })),
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
  const codeInput = await screen.findByLabelText(/enter the code/i);

  fireEvent.change(codeInput, { target: { value: '000000' } });
  fireEvent.click(screen.getByRole('button', { name: /verify/i }));

  await waitFor(() => expect(mortgageService.createLoanFromIntake).toHaveBeenCalled());

  // The factor chooser must be re-shown (working state cleared) and NO nav of either kind.
  expect(await screen.findByLabelText(/^email$/i)).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalledWith('/apply');
  expect(mockAssign).not.toHaveBeenCalled();
});

test('email -> start -> respond -> creates loan, seeds carryOverData, HARD-navigates to /apply', async () => {
  renderPage();

  // Start the email-OTP factor (username = prefilled email).
  fireEvent.click(screen.getByRole('button', { name: /email me a code/i }));
  await waitFor(() =>
    expect(mockAuthInstance.start).toHaveBeenCalledWith('ann@example.com', Factor.EMAIL_OTP)
  );

  // Code input appears; enter it and verify.
  const codeInput = await screen.findByLabelText(/enter the code/i);
  fireEvent.change(codeInput, { target: { value: '000000' } });
  fireEvent.click(screen.getByRole('button', { name: /verify/i }));

  await waitFor(() => expect(mockAuthInstance.respond).toHaveBeenCalled());
  await waitFor(() => expect(mortgageService.createLoanFromIntake).toHaveBeenCalled());
  // Prod path: hard nav (window.location.assign), NOT a SPA navigate — adopts the session.
  await waitFor(() => expect(mockAssign).toHaveBeenCalledWith('/apply'));
  expect(mockNavigate).not.toHaveBeenCalledWith('/apply');
  expect(JSON.parse(sessionStorage.getItem('carryOverData')).borrowers[0].firstName).toBe('Ann');
});

test('dev bypass (REACT_APP_DEV_SUB) uses SPA navigate, not a hard reload', async () => {
  process.env.REACT_APP_DEV_SUB = 'dev-sub';
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: /email me a code/i }));
  const codeInput = await screen.findByLabelText(/enter the code/i);
  fireEvent.change(codeInput, { target: { value: '000000' } });
  fireEvent.click(screen.getByRole('button', { name: /verify/i }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/apply'));
  expect(mockAssign).not.toHaveBeenCalled();
});
