import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ClientView from './ClientView';
import mortgageService from '../../services/mortgageService';

jest.mock('../../services/mortgageService');
jest.mock('../statusCenter/LoanStatusCenter', () => ({ loanId }) => <div data-testid="status-center-stub">{loanId}</div>);
jest.mock('../../components/documents/BorrowerDocuments', () => ({ suiteLoanId }) => <div data-testid="documents-stub">{suiteLoanId}</div>);

// useRoles mocked via a mutable box so each test can flip staff/borrower.
let mockRoles = { isStaff: true, isBorrower: false };
jest.mock('../../hooks/useRoles', () => () => mockRoles);

function renderAt(loanId) {
  return render(
    <MemoryRouter initialEntries={[`/client-view/${loanId}`]}>
      <Routes>
        <Route path="/client-view/:loanId" element={<ClientView />} />
        <Route path="/" element={<div data-testid="home" />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockRoles = { isStaff: true, isBorrower: false };
  mortgageService.getSuiteApplication = jest.fn().mockResolvedValue({
    loanNumber: '1001', borrower: { firstName: 'Ada', lastName: 'Lovelace' }, loan: {},
  });
});

it('redirects a non-staff user away from client-view', async () => {
  mockRoles = { isStaff: false, isBorrower: true };
  renderAt('L1');
  await waitFor(() => expect(screen.getByTestId('home')).toBeInTheDocument());
});

it('shows the client-view banner with the client name + a read-only notice', async () => {
  renderAt('L1');
  await waitFor(() => expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument());
  expect(screen.getByText(/client view/i)).toBeInTheDocument();
  expect(screen.getByText(/read-only/i)).toBeInTheDocument();
});

it('defaults to the Dashboard tab (LoanStatusCenter scoped to the loan)', async () => {
  renderAt('L1');
  await waitFor(() => expect(screen.getByTestId('status-center-stub')).toHaveTextContent('L1'));
});

it('switches to the Documents tab (BorrowerDocuments scoped to the loan)', async () => {
  renderAt('L1');
  await screen.findByText(/Ada Lovelace/);
  fireEvent.click(screen.getByRole('tab', { name: /documents/i }));
  expect(screen.getByTestId('documents-stub')).toHaveTextContent('L1');
});
