import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PipelineRow from './PipelineRow';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Role-aware row destination: staff → the LO Loan Dashboard, clients → their own
// application page (walkthrough finding: borrowers were sent into staff tooling).
let mockRoles = { isStaff: true };
jest.mock('../../hooks/useRoles', () => () => mockRoles);

const row = {
  id: 42,
  applicationNumber: 'APP-042',
  status: 'UNDERWRITING',
  borrowerName: 'Fortney, Matthew',
  city: 'Lehi', state: 'UT',
  outstandingConditions: 4,
  loanAmount: 485000, propertyValue: 620000, ltvPct: 78.2,
  estClosingDate: '2026-06-12',
  assignedLoName: 'Zink',
  statusChangedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  createdDate: new Date(Date.now() - 12 * 86400000).toISOString(),
};

beforeEach(() => { mockNavigate.mockReset(); });

const ORIG_SUITE_URL = process.env.REACT_APP_SUITE_WEB_URL;
afterEach(() => {
  // Restore exactly (even if an assertion failed mid-test) — assigning
  // undefined would coerce to the string "undefined".
  if (ORIG_SUITE_URL === undefined) delete process.env.REACT_APP_SUITE_WEB_URL;
  else process.env.REACT_APP_SUITE_WEB_URL = ORIG_SUITE_URL;
});

describe('PipelineRow', () => {
  test('renders borrower name + city + app number', () => {
    render(<MemoryRouter><table><tbody><PipelineRow row={row} /></tbody></table></MemoryRouter>);
    expect(screen.getByText('Fortney, Matthew')).toBeInTheDocument();
    expect(screen.getByText(/Lehi, UT/)).toBeInTheDocument();
    expect(screen.getByText(/#APP-042/)).toBeInTheDocument();
  });

  test('renders status pill with day count', () => {
    render(<MemoryRouter><table><tbody><PipelineRow row={row} /></tbody></table></MemoryRouter>);
    expect(screen.getByText('UNDERWRITING')).toBeInTheDocument();
    expect(screen.getByText(/in stage 3d/)).toBeInTheDocument();
  });

  test('shows outstanding count when > 0', () => {
    render(<MemoryRouter><table><tbody><PipelineRow row={row} /></tbody></table></MemoryRouter>);
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  test('renders amount and LTV', () => {
    render(<MemoryRouter><table><tbody><PipelineRow row={row} /></tbody></table></MemoryRouter>);
    expect(screen.getByText(/\$485K/)).toBeInTheDocument();
    expect(screen.getByText(/78\.2%/)).toBeInTheDocument();
  });

  test('STAFF row click navigates to the loan dashboard', () => {
    mockRoles = { isStaff: true };
    render(<MemoryRouter><table><tbody><PipelineRow row={row} /></tbody></table></MemoryRouter>);
    fireEvent.click(screen.getByRole('row'));
    expect(mockNavigate).toHaveBeenCalledWith('/loan/42');
  });

  test('BORROWER row click navigates to their loan status center, never staff tooling', () => {
    mockRoles = { isStaff: false };
    render(<MemoryRouter><table><tbody><PipelineRow row={row} /></tbody></table></MemoryRouter>);
    fireEvent.click(screen.getByRole('row'));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard?loan=42');
  });

  test('suite link renders when showSuiteLink + URL configured, and does not trigger row nav', () => {
    process.env.REACT_APP_SUITE_WEB_URL = 'https://suite.msfgco.com';
    render(
      <MemoryRouter><table><tbody>
        <PipelineRow row={row} showSuiteLink />
      </tbody></table></MemoryRouter>,
    );
    const link = screen.getByTestId('open-in-suite');
    expect(link).toHaveAttribute('href', `https://suite.msfgco.com/loans/${row.id}`);
    expect(link).toHaveAttribute('target', '_blank');
    fireEvent.click(link);
    expect(mockNavigate).not.toHaveBeenCalled();
    fireEvent.keyDown(link, { key: 'Enter' });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('no suite link without showSuiteLink', () => {
    process.env.REACT_APP_SUITE_WEB_URL = 'https://suite.msfgco.com';
    render(<MemoryRouter><table><tbody><PipelineRow row={row} /></tbody></table></MemoryRouter>);
    expect(screen.queryByTestId('open-in-suite')).not.toBeInTheDocument();
  });
});
