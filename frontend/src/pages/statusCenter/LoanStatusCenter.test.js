import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

jest.mock('../../services/mortgageService', () => ({
  __esModule: true,
  default: {
    getApplications: jest.fn(),
    getBorrowerDashboard: jest.fn(),
  },
}));

import mortgageService from '../../services/mortgageService';
import LoanStatusCenter from './LoanStatusCenter';

const ACTIVE_LOAN = {
  id: 'suite-1',
  applicationNumber: '1000000042',
  status: 'IN_UNDERWRITING',
  city: 'Aurora',
  state: 'CO',
  statusChangedAt: '2026-06-29T12:00:00Z',
};
const PAST_LOAN = {
  id: 'suite-2',
  applicationNumber: '1000000007',
  status: 'FUNDED',
  city: 'Lehi',
  state: 'UT',
  statusChangedAt: '2026-05-01T12:00:00Z',
};

const DASHBOARD = {
  status: 'IN_UNDERWRITING',
  property: { addressLine1: '123 Main St', city: 'Aurora', state: 'CO' },
};

// A payload with EVERY section non-null (nothing hidden by the LO). visibility{}
// is always present; showAppraisal gates the appraisal card.
const FULL_DASHBOARD = {
  status: 'IN_UNDERWRITING',
  property: { addressLine1: '123 Main St', city: 'Aurora', state: 'CO' },
  milestones: [
    { key: 'APPLICATION', label: 'Application received', state: 'DONE', date: '2026-05-01' },
    { key: 'PROCESSING', label: 'In processing', state: 'CURRENT', date: null },
    { key: 'CLEAR_TO_CLOSE', label: 'Clear to close', state: 'UPCOMING', date: null },
  ],
  conditions: {
    outstandingCount: 1,
    items: [
      { id: 'c1', status: 'REQUESTED', conditionText: '2025 W-2 — all employers', dueDate: '2026-07-08' },
      { id: 'c2', status: 'CLEARED', conditionText: 'Purchase contract', dueDate: null },
    ],
  },
  documents: {
    uploads: [
      { id: 'u1', fileName: 'paystubs_june.pdf', documentType: 'INCOME', status: 'CLEARED', uploadedAt: '2026-06-10T00:00:00Z', fromLoanTeam: false },
    ],
    fromTeam: [
      { id: 't1', fileName: 'loan_estimate.pdf', documentType: 'LOAN_ESTIMATE', status: 'CLEARED', uploadedAt: '2026-06-05T00:00:00Z', fromLoanTeam: true },
    ],
  },
  keyDates: [
    { key: 'APPRAISAL_INSPECTED', label: 'Appraisal inspection', date: '2026-07-14', urgent: false },
    { key: 'RATE_LOCK_EXPIRES', label: 'Rate lock expires', date: '2026-07-19', urgent: true },
  ],
  rateLock: { status: 'LOCKED', noteRate: 5.99, lockedAt: '2026-06-19', expiresAt: '2026-07-19', lockDays: 30 },
  loanSnapshot: {
    program: 'Conventional', noteRate: 5.99, purchasePrice: 500000, baseLoanAmount: 400000,
    totalLoanAmount: 404000, financedFeesAmount: 4000, cashToClose: 25000,
  },
  payment: {
    principalAndInterest: 2100, taxes: 400, hazardInsurance: 120,
    mortgageInsurance: 0, hoa: 0, total: 2620,
  },
  loanOfficer: { name: 'Dana Lender', title: 'Senior LO', nmls: '123456', phone: '555-1212', email: 'dana@example.com' },
  notificationPrefs: {
    conditionUpdatesEnabled: true, conditionUpdatesChannel: 'EMAIL',
    statusChangesEnabled: true, statusChangesChannel: 'EMAIL',
    keyDatesEnabled: true, keyDatesChannel: 'BOTH',
  },
  visibility: {
    showMilestones: true, showConditions: true, showDocuments: true, showKeyDates: true,
    showRateLock: true, showAppraisal: true, showSnapshot: true, showPayment: true,
    showLoanOfficer: true, showNotifications: true, showProperty: true,
  },
};

function renderPage(initialEntry = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/dashboard" element={<LoanStatusCenter />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mortgageService.getApplications.mockResolvedValue({ content: [ACTIVE_LOAN] });
  mortgageService.getBorrowerDashboard.mockResolvedValue(DASHBOARD);
});

describe('LoanStatusCenter', () => {
  test('with ONE loan: no selector, dashboard fetched for its id, hero renders address', async () => {
    renderPage();

    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard).toHaveBeenCalledWith('suite-1'),
    );
    expect(await screen.findByText(/123 Main St/)).toBeInTheDocument();
    // With a single loan there is no picker (the <select> combobox).
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /loan status center/i })).toBeInTheDocument();
  });

  test('with TWO loans: selector rendered, defaults to the active loan', async () => {
    mortgageService.getApplications.mockResolvedValue({ content: [PAST_LOAN, ACTIVE_LOAN] });

    renderPage();

    expect(await screen.findByRole('combobox')).toBeInTheDocument();
    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard).toHaveBeenCalledWith('suite-1'),
    );
  });

  test('?loan= param wins over the default selection', async () => {
    mortgageService.getApplications.mockResolvedValue({ content: [ACTIVE_LOAN, PAST_LOAN] });

    renderPage('/dashboard?loan=suite-2');

    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard).toHaveBeenCalledWith('suite-2'),
    );
    expect(mortgageService.getBorrowerDashboard).not.toHaveBeenCalledWith('suite-1');
  });

  test('picking a loan in the selector re-fetches the dashboard for it', async () => {
    mortgageService.getApplications.mockResolvedValue({ content: [ACTIVE_LOAN, PAST_LOAN] });

    renderPage();
    const select = await screen.findByRole('combobox');
    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard).toHaveBeenCalledWith('suite-1'),
    );

    fireEvent.change(select, { target: { value: 'suite-2' } });
    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard).toHaveBeenCalledWith('suite-2'),
    );
  });

  test('error state renders a dismissable banner with retry', async () => {
    // getBorrowerDashboard resolves null on failure (the service swallows errors).
    mortgageService.getBorrowerDashboard.mockResolvedValue(null);

    renderPage();

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent(/couldn.t load/i);

    // Retry re-fetches; a success clears the banner.
    mortgageService.getBorrowerDashboard.mockResolvedValue(DASHBOARD);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  test('grid skeleton columns render after load', async () => {
    const { container } = renderPage();
    await screen.findByText(/123 Main St/);
    expect(container.querySelector('.lsc-grid')).toBeInTheDocument();
    expect(container.querySelector('.lsc-rail-col')).toBeInTheDocument();
    expect(container.querySelector('.lsc-main-col')).toBeInTheDocument();
    expect(container.querySelector('.lsc-side-col')).toBeInTheDocument();
  });

  test('full payload: a representative element from every column renders', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    const { container } = renderPage();

    // Left rail — a milestone label.
    expect(await screen.findByText('In processing')).toBeInTheDocument();
    // Main — the to-do condition, the upload dropzone, a download button.
    expect(screen.getByText('2025 W-2 — all employers')).toBeInTheDocument();
    expect(screen.getByText(/Drop your documents here/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Download$/i })).toBeInTheDocument();
    // Side — the rate-lock card, the LO name, the payment total.
    // (5.990% renders in both the rate-lock and snapshot cards, hence getAllByText.)
    expect(screen.getByText('Rate lock active')).toBeInTheDocument();
    expect(screen.getAllByText(/5\.990%/).length).toBeGreaterThan(0);
    expect(screen.getByText('Dana Lender')).toBeInTheDocument();
    expect(screen.getByText('Estimated monthly payment')).toBeInTheDocument();
    // Total row renders value + " / mo" suffix in one node.
    expect(screen.getByText(/\$2,620\.00\s*\/\s*mo/)).toBeInTheDocument();
    // Appraisal card is gated by visibility.showAppraisal.
    expect(container.querySelector('.lsc-side-col')).toHaveTextContent(/Appraisal/i);
  });

  test('LO-hidden sections (rateLock/payment/loanOfficer null) render nothing while the rest stay', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      rateLock: null,
      payment: null,
      loanOfficer: null,
    });
    renderPage();

    // Visible sections still render (proves the rest of the grid is intact).
    expect(await screen.findByText('In processing')).toBeInTheDocument();
    expect(screen.getByText('2025 W-2 — all employers')).toBeInTheDocument();

    // Hidden sections are ABSENT (server-visibility contract flows to the UI).
    expect(screen.queryByText('Rate lock active')).not.toBeInTheDocument();
    expect(screen.queryByText('Estimated monthly payment')).not.toBeInTheDocument();
    expect(screen.queryByText('Your loan officer')).not.toBeInTheDocument();
    expect(screen.queryByText('Dana Lender')).not.toBeInTheDocument();
  });

  test('Key dates "Open calendar" opens the modal; closing removes it', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    const { container } = renderPage();

    const openBtn = await screen.findByRole('button', { name: /open calendar/i });
    expect(container.querySelector('.lsc-modal-bg')).not.toBeInTheDocument();

    fireEvent.click(openBtn);
    expect(container.querySelector('.lsc-modal-bg')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() =>
      expect(container.querySelector('.lsc-modal-bg')).not.toBeInTheDocument(),
    );
  });
});
