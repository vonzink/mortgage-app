import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LoanSelector from './LoanSelector';

const NOW = new Date('2026-07-02T12:00:00Z');
const iso = (daysAgo) => new Date(NOW - daysAgo * 86400000).toISOString();

const LOANS = [
  { id: 'a-1', status: 'IN_UNDERWRITING', statusChangedAt: iso(3), loanNumber: '1000000042', label: 'Aurora, CO' },
  { id: 'p-1', status: 'FUNDED', statusChangedAt: iso(40), loanNumber: '1000000007', label: 'Lehi, UT' },
  { id: 'o-1', status: 'WITHDRAWN', statusChangedAt: iso(500), loanNumber: '1000000001', label: 'Denver, CO' },
];

describe('LoanSelector', () => {
  test('renders Active and Past optgroups with option labels', () => {
    render(<LoanSelector loans={LOANS} selectedId="a-1" onSelect={jest.fn()} />);

    const select = screen.getByLabelText(/loan/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Past' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /#1000000042/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /#1000000007/ })).toBeInTheDocument();
  });

  test('older loans hidden until the expander is activated', () => {
    render(<LoanSelector loans={LOANS} selectedId="a-1" onSelect={jest.fn()} />);

    expect(screen.queryByRole('group', { name: 'Older' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /#1000000001/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /view older loans/i }));

    expect(screen.getByRole('group', { name: 'Older' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /#1000000001/ })).toBeInTheDocument();
  });

  test('no expander when there are no older loans', () => {
    render(<LoanSelector loans={LOANS.slice(0, 2)} selectedId="a-1" onSelect={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /view older loans/i })).not.toBeInTheDocument();
  });

  test('onSelect fires with the picked id', () => {
    const onSelect = jest.fn();
    render(<LoanSelector loans={LOANS} selectedId="a-1" onSelect={onSelect} />);

    fireEvent.change(screen.getByLabelText(/loan/i), { target: { value: 'p-1' } });
    expect(onSelect).toHaveBeenCalledWith('p-1');
  });

  test('option label humanizes the status and falls back to a short id without a loan number', () => {
    const loans = [
      { id: 'abcdef12-3456-7890-abcd-ef1234567890', status: 'APPROVED_WITH_CONDITIONS', statusChangedAt: iso(1), loanNumber: null, label: null },
      { id: 'p-1', status: 'FUNDED', statusChangedAt: iso(40), loanNumber: '7', label: null },
    ];
    render(<LoanSelector loans={loans} selectedId="p-1" onSelect={jest.fn()} />);
    expect(screen.getByRole('option', { name: /#abcdef12 — Approved with conditions/ })).toBeInTheDocument();
  });
});
