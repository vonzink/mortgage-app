import React from 'react';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import ClientApplicationsPage from './ClientApplicationsPage';
import mortgageService from '../../services/mortgageService';

jest.mock('../../services/mortgageService');

let mockRoles = { isStaff: true, isBorrower: false };
jest.mock('../../hooks/useRoles', () => () => mockRoles);

/** Renders the /apply landing so navigation assertions can read the real query string. */
function ApplyProbe() {
  const { pathname, search } = useLocation();
  return <div data-testid="apply-probe">{`${pathname}${search}`}</div>;
}

function renderAt(borrowerId = 'B7') {
  return render(
    <MemoryRouter initialEntries={[`/client/${borrowerId}/applications`]}>
      <Routes>
        <Route path="/client/:borrowerId/applications" element={<ClientApplicationsPage />} />
        <Route path="/apply" element={<ApplyProbe />} />
        <Route path="/client-view/:loanId" element={<div data-testid="client-view-probe" />} />
        <Route path="/" element={<div data-testid="home" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const ACCESSIBLE = {
  loanId: 'L1',
  loanNumber: '1001',
  status: 'PROCESSING',
  primaryBorrowerName: 'Ada Lovelace',
  propertyCity: 'Boise',
  propertyState: 'ID',
  loanOfficerName: 'Sam Officer',
  updatedAt: '2026-07-01T12:00:00Z',
  matchedOn: 'account',
};

const RESTRICTED = {
  loanId: 'L2',
  loanNumber: '2002',
  status: 'UNDERWRITING',
  primaryBorrowerName: 'Ada Lovelace',
  propertyCity: 'Meridian',
  propertyState: 'ID',
  loanOfficerName: 'Dana Rival',
  loanOfficerInactive: false,
  matchedOn: 'email',
};

function mockLoans({ accessible = [], restricted = [], totalMatched } = {}) {
  mortgageService.getClientLoans = jest.fn().mockResolvedValue({
    accessible,
    restricted,
    totalMatched: totalMatched ?? accessible.length + restricted.length,
  });
}

beforeEach(() => {
  mockRoles = { isStaff: true, isBorrower: false };
  mockLoans({ accessible: [ACCESSIBLE], restricted: [RESTRICTED] });
});

it('renders both an accessible and a restricted row', async () => {
  renderAt();

  const accessible = await screen.findByTestId('client-loan-L1');
  const restricted = screen.getByTestId('client-loan-L2');

  expect(within(accessible).getByText(/1001/)).toBeInTheDocument();
  expect(within(accessible).getByText(/Boise, ID/)).toBeInTheDocument();
  expect(within(accessible).getByText(/PROCESSING/)).toBeInTheDocument();

  expect(within(restricted).getByText(/2002/)).toBeInTheDocument();
  expect(within(restricted).getByText(/Meridian, ID/)).toBeInTheDocument();
  expect(within(restricted).getByText(/UNDERWRITING/)).toBeInTheDocument();
});

it('fetches with the borrowerId from the route', async () => {
  renderAt('B42');
  await screen.findByTestId('client-loan-L1');
  expect(mortgageService.getClientLoans).toHaveBeenCalledWith('B42');
});

it('opens an accessible loan in the /apply editor', async () => {
  renderAt();

  const row = await screen.findByTestId('client-loan-L1');
  fireEvent.click(within(row).getByRole('button', { name: /open application/i }));

  await waitFor(() =>
    expect(screen.getByTestId('apply-probe')).toHaveTextContent('/apply?loan=L1'),
  );
});

it('links an accessible loan to its client-view dashboard', async () => {
  renderAt();

  const row = await screen.findByTestId('client-loan-L1');
  expect(within(row).getByRole('link', { name: /view dashboard/i })).toHaveAttribute(
    'href',
    '/client-view/L1',
  );
});

it('names the owning officer on a restricted row and offers NO way in', async () => {
  renderAt();

  const row = await screen.findByTestId('client-loan-L2');

  expect(within(row).getByText(/Dana Rival/)).toBeInTheDocument();
  expect(within(row).getByText(/Access:\s*Restricted/i)).toBeInTheDocument();
  expect(
    within(row).getByText(/This loan is assigned to another loan officer\./i),
  ).toBeInTheDocument();

  // Absent, not merely disabled — a restricted loan 403s server-side. Both queries are
  // deliberately UNNAMED: a future "Request access" control would slip past a name-scoped one.
  expect(within(row).queryByRole('button')).not.toBeInTheDocument();
  expect(within(row).queryByRole('link')).not.toBeInTheDocument();
});

it('redirects a non-staff session and never asks the server for the loans', async () => {
  mockRoles = { isStaff: false, isBorrower: true };
  renderAt();

  await waitFor(() => expect(screen.getByTestId('home')).toBeInTheDocument());
  // The fetch firing at all is the part that matters — the borrowerId isn't theirs.
  expect(mortgageService.getClientLoans).not.toHaveBeenCalled();
});

it('marks an inactive owning officer while still naming them', async () => {
  mockLoans({
    accessible: [],
    restricted: [{ ...RESTRICTED, loanOfficerName: 'Gone Guy', loanOfficerInactive: true }],
  });
  renderAt();

  const row = await screen.findByTestId('client-loan-L2');
  expect(within(row).getByText(/Gone Guy/)).toBeInTheDocument();
  expect(within(row).getByText(/inactive/i)).toBeInTheDocument();
});

it('badges a row matched by email rather than by linked account', async () => {
  renderAt();

  const emailMatched = await screen.findByTestId('client-loan-L2');
  expect(within(emailMatched).getByText(/matched by email/i)).toBeInTheDocument();

  const accountMatched = screen.getByTestId('client-loan-L1');
  expect(within(accountMatched).queryByText(/matched by email/i)).not.toBeInTheDocument();
});

it('names the client from the rows when the context stash is absent (deep link / refresh)', async () => {
  sessionStorage.clear();
  renderAt();

  await screen.findByTestId('client-loan-L1');
  expect(screen.getByText(/All loans on file for Ada Lovelace\./i)).toBeInTheDocument();
});

it('discloses truncation when totalMatched exceeds the rows returned', async () => {
  mockLoans({ accessible: [ACCESSIBLE], restricted: [RESTRICTED], totalMatched: 214 });
  renderAt();

  await screen.findByTestId('client-loan-L1');
  expect(screen.getByText(/showing 2 of 214 matches/i)).toBeInTheDocument();
});

it('says nothing about truncation when every match was returned', async () => {
  mockLoans({ accessible: [ACCESSIBLE], restricted: [RESTRICTED], totalMatched: 2 });
  renderAt();

  await screen.findByTestId('client-loan-L1');
  expect(screen.queryByText(/showing \d+ of \d+ matches/i)).not.toBeInTheDocument();
});

it('renders an empty state when the client has no loans', async () => {
  mockLoans({ accessible: [], restricted: [], totalMatched: 0 });
  renderAt();

  expect(await screen.findByText(/no applications yet/i)).toBeInTheDocument();
});

it('renders a loading state before the fetch resolves', async () => {
  let resolve;
  mortgageService.getClientLoans = jest.fn(
    () => new Promise((r) => { resolve = r; }),
  );
  renderAt();

  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  resolve({ accessible: [ACCESSIBLE], restricted: [], totalMatched: 1 });
  await screen.findByTestId('client-loan-L1');
});

it('renders an error state when the fetch rejects', async () => {
  mortgageService.getClientLoans = jest.fn().mockRejectedValue(new Error('boom'));
  renderAt();

  expect(await screen.findByText(/couldn.t load/i)).toBeInTheDocument();
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});
