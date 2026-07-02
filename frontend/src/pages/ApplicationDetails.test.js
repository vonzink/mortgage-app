import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ApplicationDetails from './ApplicationDetails';
import mortgageService from '../services/mortgageService';
import * as suiteWeb from '../services/suiteWeb';

// ── heavy feature panels — irrelevant to the header link under test ─────────
jest.mock('../workspace/WorkspaceTab', () => () => <div data-testid="workspace-tab-stub" />);
jest.mock('../components/documents/BorrowerDocuments', () => () => <div data-testid="borrower-documents-stub" />);
jest.mock('../components/documents/StaffDocumentsPanel', () => () => <div data-testid="staff-documents-panel-stub" />);

// ── mortgageService ───────────────────────────────────────────────────────
jest.mock('../services/mortgageService', () => ({
  __esModule: true,
  default: {
    getApplication: jest.fn(),
    getApplicationDocuments: jest.fn(),
    getBorrowerDocuments: jest.fn(),
    getStatusHistory: jest.fn(),
  },
}));

// ── suiteLoanUrl — spy so individual tests can vary its return value ────────
jest.mock('../services/suiteWeb', () => ({
  __esModule: true,
  suiteLoanUrl: jest.fn(),
}));

// ── useRoles — mutable per-test via a module-level box ───────────────────────
let mockRoles = { isBorrower: false, isStaff: false };
jest.mock('../hooks/useRoles', () => () => mockRoles);

const APPLICATION = {
  id: 'loan-123',
  applicationNumber: '1001',
  status: 'DRAFT',
  borrowers: [{ firstName: 'Ann', lastName: 'Buyer' }],
};

function renderPage(id = 'loan-123') {
  return render(
    <MemoryRouter initialEntries={[`/applications/${id}`]}>
      <Routes>
        <Route path="/applications/:id" element={<ApplicationDetails />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mortgageService.getApplication.mockResolvedValue(APPLICATION);
  mortgageService.getApplicationDocuments.mockResolvedValue([]);
  mortgageService.getBorrowerDocuments.mockResolvedValue([]);
  mortgageService.getStatusHistory.mockResolvedValue([]);
});

test('staff with a configured suite URL sees the Open in Suite link, correctly wired', async () => {
  mockRoles = { isBorrower: false, isStaff: true };
  suiteWeb.suiteLoanUrl.mockReturnValue('https://suite.msfgco.com/loans/loan-123');

  renderPage('loan-123');
  const link = await screen.findByTestId('open-in-suite-details');
  await waitFor(() => expect(mortgageService.getStatusHistory).toHaveBeenCalled());
  expect(link).toHaveAttribute('href', 'https://suite.msfgco.com/loans/loan-123');
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  expect(link).toHaveAttribute('title', 'Open this loan in the msfg-suite console');
  expect(link).toHaveTextContent('Open in Suite ↗');
  expect(suiteWeb.suiteLoanUrl).toHaveBeenCalledWith('loan-123');
});

test('non-staff user does not see the Open in Suite link even when the suite URL is configured', async () => {
  mockRoles = { isBorrower: true, isStaff: false };
  suiteWeb.suiteLoanUrl.mockReturnValue('https://suite.msfgco.com/loans/loan-123');

  renderPage('loan-123');
  await screen.findByText(/Application #1001/i);
  await waitFor(() => expect(mortgageService.getStatusHistory).toHaveBeenCalled());

  expect(screen.queryByTestId('open-in-suite-details')).not.toBeInTheDocument();
});

test('staff user does not see the Open in Suite link when the suite URL is unconfigured', async () => {
  mockRoles = { isBorrower: false, isStaff: true };
  suiteWeb.suiteLoanUrl.mockReturnValue(null);

  renderPage('loan-123');
  await screen.findByText(/Application #1001/i);
  await waitFor(() => expect(mortgageService.getStatusHistory).toHaveBeenCalled());

  expect(screen.queryByTestId('open-in-suite-details')).not.toBeInTheDocument();
});

test('staff branch renders the read-only StaffDocumentsPanel, not WorkspaceTab', async () => {
  mockRoles = { isBorrower: false, isStaff: true };
  suiteWeb.suiteLoanUrl.mockReturnValue('https://suite.msfgco.com/loans/loan-123');

  renderPage('loan-123');
  await waitFor(() => expect(mortgageService.getStatusHistory).toHaveBeenCalled());

  expect(await screen.findByTestId('staff-documents-panel-stub')).toBeInTheDocument();
  expect(screen.queryByTestId('workspace-tab-stub')).not.toBeInTheDocument();
});

test('borrower branch is untouched: still renders BorrowerDocuments keyed by loanId', async () => {
  mockRoles = { isBorrower: true, isStaff: false };

  renderPage('loan-123');
  await waitFor(() => expect(mortgageService.getStatusHistory).toHaveBeenCalled());

  expect(await screen.findByTestId('borrower-documents-stub')).toBeInTheDocument();
  expect(screen.queryByTestId('workspace-tab-stub')).not.toBeInTheDocument();
  expect(screen.queryByTestId('staff-documents-panel-stub')).not.toBeInTheDocument();
});
