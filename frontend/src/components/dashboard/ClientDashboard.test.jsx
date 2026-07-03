import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../../services/mortgageService', () => ({
  __esModule: true,
  default: { getBorrowerDashboard: jest.fn() },
}));

import mortgageService from '../../services/mortgageService';
import ClientDashboard, { StatusProgressLine } from './ClientDashboard';

const DASHBOARD = {
  loanId: 'L1',
  loanNumber: '1000000013',
  status: 'IN_UNDERWRITING',
  property: { addressLine1: '742 Evergreen Terrace', city: 'Aurora', state: 'CO', salesPrice: 675000 },
  loanTerms: { baseLoanAmount: 575000, interestRate: 5.99 },
  housingExpenses: {
    proposedTaxesMonthly: 520,
    proposedHazardInsuranceMonthly: 300,
    proposedMortgageInsuranceMonthly: 238.25,
    proposedHoaDuesMonthly: 85,
  },
  conditions: {
    outstandingCount: 1,
    items: [
      { conditionText: 'Provide 2 most recent bank statements', status: 'Outstanding', dueDate: '2026-07-10' },
      { conditionText: 'Signed borrower authorization', status: 'Cleared', clearedAt: '2026-07-01T12:00:00Z' },
    ],
  },
  statusHistory: [],
  consummationDate: '2026-08-15',
};

describe('StatusProgressLine', () => {
  test('highlights the journey up to the current status', () => {
    render(<StatusProgressLine status="IN_UNDERWRITING" />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.textContent.replace('—', '').trim())).toEqual([
      'Started', 'Application', 'Submitted', 'Underwriting', 'Approved', 'Clear to Close', 'Closing', 'Funded',
    ]);
    expect(screen.getByText('Underwriting').closest('li')).toHaveAttribute('data-current');
  });

  test('terminal statuses show a plain-language banner instead of the line', () => {
    render(<StatusProgressLine status="DENIED" />);
    expect(screen.getByTestId('status-terminal')).toHaveTextContent(/not approved/i);
    expect(screen.queryByTestId('status-progress')).not.toBeInTheDocument();
  });
});

describe('ClientDashboard', () => {
  test('shows loan facts, outstanding vs cleared conditions, and housing expense', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(DASHBOARD);
    render(<ClientDashboard suiteLoanId="L1" />);

    expect(await screen.findByTestId('client-dashboard')).toBeInTheDocument();
    expect(screen.getByText(/#1000000013/)).toBeInTheDocument();
    expect(screen.getByText(/742 Evergreen Terrace/)).toBeInTheDocument();
    expect(screen.getByText('$575,000.00')).toBeInTheDocument();
    expect(screen.getByText(/1 outstanding/)).toBeInTheDocument();
    expect(screen.getByTestId('conditions-outstanding')).toHaveTextContent('bank statements');
    expect(screen.getByTestId('conditions-cleared')).toHaveTextContent('borrower authorization');
    expect(screen.getByTestId('housing-expense')).toHaveTextContent('$520.00');
    // total of the four rows
    expect(screen.getByTestId('housing-expense')).toHaveTextContent('$1,143.25');
  });

  test('renders nothing when the aggregate is unavailable (page degrades gracefully)', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(null);
    const { container } = render(<ClientDashboard suiteLoanId="L1" />);
    await screen.findByText(/Loading your loan/i).catch(() => {});
    // after resolution the component unmounts to nothing
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('[data-testid="client-dashboard"]')).toBeNull();
  });
});
