import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClientApplicationView from './ClientApplicationView';
import mortgageService from '../../services/mortgageService';

jest.mock('../../services/suiteWeb', () => ({
  suiteLoanUrl: (id) => `https://suite.example/loans/${id}`,
}));
jest.mock('../../services/mortgageService');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

let mockRoles = { isStaff: true };
jest.mock('../../hooks/useRoles', () => () => mockRoles);

beforeEach(() => {
  mockNavigate.mockClear();
  mockRoles = { isStaff: true };
  mortgageService.getSuiteEmployments = jest.fn().mockResolvedValue([]);
  mortgageService.getSuiteBorrowerAddresses = jest.fn().mockResolvedValue([]);
  mortgageService.getSuiteIncome = jest.fn().mockResolvedValue([]);
});

const application = {
  loanId: 'L1', loanNumber: '1001', borrowerId: 'B1',
  borrower: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.com', cellPhone: '555-1000', hasSsn: true },
  loan: { mortgageType: 'CONVENTIONAL', baseLoanAmount: 400000, addressLine1: '1 Analytical Way', city: 'Denver', state: 'CO', postalCode: '80202', propertyType: 'SINGLE_FAMILY', occupancyType: 'PRIMARY_RESIDENCE' },
};

it('renders the client 1003 read-only with borrower + property', () => {
  render(<ClientApplicationView application={application} loanId="L1" />);
  expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  expect(screen.getByText('ada@x.com')).toBeInTheDocument();
  expect(screen.getByText(/1 Analytical Way/)).toBeInTheDocument();
  expect(screen.getByText(/Denver, CO/)).toBeInTheDocument();
});

it('links a suite user to the loan workspace for editing', () => {
  render(<ClientApplicationView application={application} loanId="L1" />);
  const link = screen.getByRole('link', { name: /edit in suite/i });
  expect(link).toHaveAttribute('href', 'https://suite.example/loans/L1');
});

// The suite has its own permissions: borrowers and agents have no account there. Showing them
// the link would advertise a door that 401s on arrival, and this component is rendered inside a
// shell whose own gate could be relaxed later — so it refuses on its own terms, not the parent's.
it('hides the suite link from anyone who is not a suite user', () => {
  mockRoles = { isStaff: false };
  render(<ClientApplicationView application={application} loanId="L1" />);
  expect(screen.queryByRole('link', { name: /edit in suite/i })).not.toBeInTheDocument();
  // The in-app path is unaffected — it does not depend on suite access.
  expect(screen.getByRole('button', { name: /fill out application/i })).toBeInTheDocument();
});

it('staff can jump to the wizard with Fill out application', () => {
  render(<ClientApplicationView application={application} loanId="L1" />);
  fireEvent.click(screen.getByRole('button', { name: /fill out application/i }));
  expect(mockNavigate).toHaveBeenCalledWith('/apply?loan=L1');
});

it('renders an empty-state when application is null', () => {
  render(<ClientApplicationView application={null} loanId="L1" />);
  expect(screen.getByText(/no application data/i)).toBeInTheDocument();
});

describe('work + residence history', () => {
  it('renders employers with dates, income and a Current badge', async () => {
    mortgageService.getSuiteEmployments.mockResolvedValue([
      {
        id: 'E1', employerName: 'Acme Corp', positionTitle: 'Engineer',
        employmentStatus: 'CURRENT', startDate: '2019-03-01', endDate: null,
        employerCity: 'Denver', employerState: 'CO', employerPhone: '3035551212',
        monthsInLineOfWork: 30,
      },
      {
        id: 'E2', employerName: 'Old Co', positionTitle: 'Analyst',
        employmentStatus: 'PREVIOUS', startDate: '2015-01-01', endDate: '2019-02-01',
      },
    ]);
    // Two items on one employer must SUM (base + bonus), and other-income (null id) is excluded.
    mortgageService.getSuiteIncome.mockResolvedValue([
      { id: 'I1', employmentId: 'E1', incomeType: 'BASE', monthlyAmount: 8000 },
      { id: 'I2', employmentId: 'E1', incomeType: 'BONUS', monthlyAmount: 500 },
      { id: 'I3', employmentId: null, incomeType: 'PENSION', monthlyAmount: 1200 },
    ]);

    render(<ClientApplicationView application={application} loanId="L1" />);

    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Engineer · Mar 2019 – Present')).toBeInTheDocument();
    expect(screen.getByText('$8,500')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('2 yrs 6 mos')).toBeInTheDocument();
    expect(screen.getByText('Analyst · Jan 2015 – Feb 2019')).toBeInTheDocument();
    expect(mortgageService.getSuiteEmployments).toHaveBeenCalledWith('L1', 'B1');
  });

  it('orders residences present-first regardless of the API order', async () => {
    mortgageService.getSuiteBorrowerAddresses.mockResolvedValue([
      { id: 'A1', addressType: 'MAILING', ordinal: 0, addressLine1: 'PO Box 9', city: 'Denver', state: 'CO' },
      { id: 'A2', addressType: 'PRESENT', ordinal: 0, addressLine1: '10 Now St', city: 'Denver', state: 'CO', postalCode: '80202', ownershipType: 'RENT', rentAmount: 2100, residencyDurationYears: 2, residencyDurationMonths: 4 },
      { id: 'A3', addressType: 'PREVIOUS', ordinal: 1, addressLine1: '5 Then Ave', city: 'Boulder', state: 'CO', ownershipType: 'OWN' },
    ]);

    render(<ClientApplicationView application={application} loanId="L1" />);

    await screen.findByText('10 Now St');
    const titles = screen.getAllByText(/10 Now St|5 Then Ave|PO Box 9/).map((n) => n.textContent);
    expect(titles).toEqual(['10 Now St', '5 Then Ave', 'PO Box 9']);
    expect(screen.getByText('Rent')).toBeInTheDocument();        // ownership of the present address
    expect(screen.getByText('$2,100')).toBeInTheDocument();
    expect(screen.getByText('2 yrs 4 mos')).toBeInTheDocument();
  });

  it('shows a none-on-file note per section when the suite has no history', async () => {
    render(<ClientApplicationView application={application} loanId="L1" />);
    await waitFor(() => expect(mortgageService.getSuiteIncome).toHaveBeenCalled());
    expect(screen.getByText('No employment on file.')).toBeInTheDocument();
    expect(screen.getByText('No addresses on file.')).toBeInTheDocument();
  });

  it('skips the history fetches when the response carries no borrowerId', () => {
    render(<ClientApplicationView application={{ ...application, borrowerId: undefined }} loanId="L1" />);
    expect(mortgageService.getSuiteEmployments).not.toHaveBeenCalled();
    expect(screen.getByText('No employment on file.')).toBeInTheDocument();
  });
});
