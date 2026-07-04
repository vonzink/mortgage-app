import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PipelineTable from './PipelineTable';

const rows = [
  { id: 1, applicationNumber: 'APP-001', status: 'UNDERWRITING', borrowerName: 'A One',
    city: 'X', state: 'X', outstandingConditions: 0, loanAmount: 100000, propertyValue: 200000,
    ltvPct: 50, estClosingDate: null, assignedLoName: 'Z',
    statusChangedAt: new Date().toISOString(), createdDate: new Date().toISOString() },
];

test('renders the column headers', () => {
  render(<MemoryRouter><PipelineTable rows={rows} sort={{ field: 'createdDate', dir: 'desc' }} onSort={() => {}} /></MemoryRouter>);
  expect(screen.getByText(/Borrower/i)).toBeInTheDocument();
  expect(screen.getByText('Status')).toBeInTheDocument();
  expect(screen.getByText(/Cond/i)).toBeInTheDocument();
  expect(screen.getByText(/Amount/i)).toBeInTheDocument();
  expect(screen.getByText(/Close/i)).toBeInTheDocument();
  expect(screen.getByText('LO')).toBeInTheDocument();
});

test('renders each row', () => {
  render(<MemoryRouter><PipelineTable rows={rows} sort={{ field: 'createdDate', dir: 'desc' }} onSort={() => {}} /></MemoryRouter>);
  expect(screen.getByText('A One')).toBeInTheDocument();
});

test('clicking a sortable header calls onSort', () => {
  const onSort = vi.fn();
  render(<MemoryRouter><PipelineTable rows={rows} sort={{ field: 'createdDate', dir: 'desc' }} onSort={onSort} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /amount/i }));
  expect(onSort).toHaveBeenCalledWith('loanAmount', 'desc');
});

test('clicking the current sort column toggles direction', () => {
  const onSort = vi.fn();
  render(<MemoryRouter><PipelineTable rows={rows} sort={{ field: 'loanAmount', dir: 'desc' }} onSort={onSort} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /amount/i }));
  expect(onSort).toHaveBeenCalledWith('loanAmount', 'asc');
});

test('shows empty message when rows is []', () => {
  render(<MemoryRouter><PipelineTable rows={[]} sort={{ field: 'createdDate', dir: 'desc' }} onSort={() => {}} /></MemoryRouter>);
  expect(screen.getByText(/no loans match/i)).toBeInTheDocument();
});
