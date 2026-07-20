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

beforeEach(() => {
  mockNavigate.mockClear();
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

it('links to the console loan workspace for editing', () => {
  render(<ClientApplicationView application={application} loanId="L1" />);
  const link = screen.getByRole('link', { name: /edit in console/i });
  expect(link).toHaveAttribute('href', 'https://suite.example/loans/L1');
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
