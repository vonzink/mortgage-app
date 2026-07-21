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

// ── window.location.assign — the REAL-Cognito hard-nav target (regression guard) ─
// The prod path MUST hard-navigate (storeUser doesn't raise userLoaded → a SPA
// navigate would leave isAuthenticated=false → RequireAuth bounces to hosted UI).
// REACT_APP_DEV_SUB is unset under test, so finishAndContinue takes the prod branch.
const mockAssign = jest.fn();
Object.defineProperty(window, 'location', {
  configurable: true,
  value: { assign: mockAssign, href: 'http://localhost/' },
});

// ── mortgageService ──────────────────────────────────────────────────────────
jest.mock('../services/mortgageService', () => ({
  __esModule: true,
  default: {
    createLoanFromIntake: jest.fn().mockResolvedValue({ loanId: 'L1', loanNumber: '100' }),
    acceptCoBorrowerInvite: jest.fn().mockResolvedValue({}),
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
  mockAssign.mockClear();
  mortgageService.createLoanFromIntake.mockClear();
  mortgageService.acceptCoBorrowerInvite.mockClear();
  // the mocked window.location object is reused across tests (see the
  // Object.defineProperty above) — reset the fragment so the payload-based tests
  // (which set it to '' via the default) don't leak an invite from a prior test.
  window.location.hash = '';
  // .env sets REACT_APP_DEV_SUB for local dev; delete it so each test exercises the
  // PROD (hard-nav) branch by default. The dev-path test sets it back explicitly.
  delete process.env.REACT_APP_DEV_SUB;
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

test('stashed loSlug (from /lo/:slug) rides the intake body and is NOT consumed here', async () => {
  // The LO vanity page stashed the slug before routing into the funnel. ContinuePage
  // must forward it on the intake (LO attribution) but NOT clear it — the borrower may
  // bounce and retry; ApplicationForm's successful submit is what consumes it.
  sessionStorage.setItem('loSlug', 'zack-zink');
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: /email me a code/i }));
  const codeInput = await screen.findByLabelText(/enter the code/i);
  fireEvent.change(codeInput, { target: { value: '000000' } });
  fireEvent.click(screen.getByRole('button', { name: /verify/i }));

  await waitFor(() => expect(mortgageService.createLoanFromIntake).toHaveBeenCalledTimes(1));
  expect(mortgageService.createLoanFromIntake.mock.calls[0][0].loSlug).toBe('zack-zink');
  expect(sessionStorage.getItem('loSlug')).toBe('zack-zink');
});

test('no stashed loSlug → intake body carries NO loSlug key', async () => {
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: /email me a code/i }));
  const codeInput = await screen.findByLabelText(/enter the code/i);
  fireEvent.change(codeInput, { target: { value: '000000' } });
  fireEvent.click(screen.getByRole('button', { name: /verify/i }));

  await waitFor(() => expect(mortgageService.createLoanFromIntake).toHaveBeenCalledTimes(1));
  expect('loSlug' in mortgageService.createLoanFromIntake.mock.calls[0][0]).toBe(false);
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

// ── co-borrower invite entry (URL fragment #invite=<token>&loan=<loanId>[&dest=dashboard]) ──
describe('co-borrower invite entry', () => {
  function renderInvite(hash) {
    window.location.hash = hash;
    return render(
      <MemoryRouter initialEntries={['/continue']}>
        <ContinuePage />
      </MemoryRouter>
    );
  }

  // Drives the shared FactorChooser through email -> start -> code -> verify, which
  // fires onAuthenticated (finishCoBorrowerInvite here). Mirrors the payload-flow tests.
  async function completeFactor(email = 'co@example.com') {
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: email } });
    fireEvent.click(screen.getByRole('button', { name: /email me a code/i }));
    const codeInput = await screen.findByLabelText(/enter the code/i);
    fireEvent.change(codeInput, { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: /verify/i }));
  }

  test('no dest: accepts invite, hard-navigates to /apply, stashes suiteLoanId (regression pin)', async () => {
    renderInvite('#invite=tok123&loan=42');
    await completeFactor();

    await waitFor(() =>
      expect(mortgageService.acceptCoBorrowerInvite).toHaveBeenCalledWith('42', 'tok123')
    );
    await waitFor(() => expect(mockAssign).toHaveBeenCalledWith('/apply'));
    expect(mockNavigate).not.toHaveBeenCalledWith('/apply');
    expect(sessionStorage.getItem('suiteLoanId')).toBe('42');
  });

  test('junk dest: falls back to /apply (unrecognized dest = default behavior)', async () => {
    renderInvite('#invite=tok123&loan=42&dest=bogus');
    await completeFactor();

    await waitFor(() => expect(mockAssign).toHaveBeenCalledWith('/apply'));
    expect(sessionStorage.getItem('suiteLoanId')).toBe('42');
  });

  test('dest=dashboard: accepts invite and hard-navigates to /dashboard?loan=<loanId>', async () => {
    renderInvite('#invite=tok123&loan=42&dest=dashboard');
    await completeFactor();

    await waitFor(() =>
      expect(mortgageService.acceptCoBorrowerInvite).toHaveBeenCalledWith('42', 'tok123')
    );
    await waitFor(() => expect(mockAssign).toHaveBeenCalledWith('/dashboard?loan=42'));
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
  });

  test('dest=dashboard: does NOT stash suiteLoanId (irrelevant to the dashboard route, which resolves its loan via ?loan=)', async () => {
    renderInvite('#invite=tok123&loan=42&dest=dashboard');
    await completeFactor();

    await waitFor(() => expect(mockAssign).toHaveBeenCalledWith('/dashboard?loan=42'));
    expect(sessionStorage.getItem('suiteLoanId')).toBeNull();
  });

  test('dest=dashboard: dev bypass (REACT_APP_DEV_SUB) uses SPA navigate to /dashboard?loan=<loanId>', async () => {
    process.env.REACT_APP_DEV_SUB = 'dev-sub';
    renderInvite('#invite=tok123&loan=42&dest=dashboard');
    await completeFactor();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard?loan=42'));
    expect(mockAssign).not.toHaveBeenCalled();
  });

  test('dest=dashboard sharpens the landing copy', () => {
    renderInvite('#invite=tok123&loan=42&dest=dashboard');
    expect(screen.getByText(/loan dashboard/i)).toBeInTheDocument();
  });

  test('no dest keeps the application-focused landing copy (regression pin)', () => {
    renderInvite('#invite=tok123&loan=42');
    expect(screen.getByText(/your part of the application/i)).toBeInTheDocument();
  });
});
