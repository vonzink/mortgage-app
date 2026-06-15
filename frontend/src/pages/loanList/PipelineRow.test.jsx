import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PipelineRow from './PipelineRow';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

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

  test('row click navigates to loan dashboard', () => {
    render(<MemoryRouter><table><tbody><PipelineRow row={row} /></tbody></table></MemoryRouter>);
    fireEvent.click(screen.getByRole('row'));
    expect(mockNavigate).toHaveBeenCalledWith('/loan/42');
  });
});
