import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ClientApplicationView from './ClientApplicationView';

jest.mock('../../services/suiteWeb', () => ({
  suiteLoanUrl: (id) => `https://suite.example/loans/${id}`,
}));

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
});

const application = {
  loanId: 'L1', loanNumber: '1001',
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
