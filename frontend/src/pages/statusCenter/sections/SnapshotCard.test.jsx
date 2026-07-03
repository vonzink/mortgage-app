import React from 'react';
import { render, screen } from '@testing-library/react';
import SnapshotCard from './SnapshotCard';

const FULL = {
  program: 'FHA 30 Year Fixed',
  noteRate: 5.99,
  purchasePrice: 675000,
  baseLoanAmount: 575000,
  totalLoanAmount: 585062,
  financedFeesAmount: 10062,
  cashToClose: 108997.5,
};

describe('SnapshotCard', () => {
  test('renders program, note-rate percent and currency rows', () => {
    render(<SnapshotCard loanSnapshot={FULL} />);
    expect(screen.getByText('FHA 30 Year Fixed')).toBeInTheDocument();
    expect(screen.getByText('5.990%')).toBeInTheDocument();
    expect(screen.getByText('$675,000.00')).toBeInTheDocument();
    expect(screen.getByText('$585,062.00')).toBeInTheDocument();
  });

  test('the total-loan row gets the highlighted hl class', () => {
    const { container } = render(<SnapshotCard loanSnapshot={FULL} />);
    const hl = container.querySelector('.lsc-kv.is-hl');
    expect(hl).not.toBeNull();
    expect(hl.textContent).toMatch(/Total loan amount/);
    expect(hl.textContent).toMatch(/\$585,062\.00/);
  });

  test('null rows are omitted', () => {
    render(
      <SnapshotCard
        loanSnapshot={{ program: 'FHA 30 Year Fixed', noteRate: 5.99, purchasePrice: null, baseLoanAmount: null, totalLoanAmount: null, financedFeesAmount: null, cashToClose: null }}
      />,
    );
    expect(screen.getByText('FHA 30 Year Fixed')).toBeInTheDocument();
    expect(screen.getByText('5.990%')).toBeInTheDocument();
    expect(screen.queryByText(/Purchase price/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Base loan amount/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Total loan amount/)).not.toBeInTheDocument();
  });

  test('renders nothing when snapshot is null', () => {
    const { container } = render(<SnapshotCard loanSnapshot={null} />);
    expect(container.querySelector('.lsc-card')).toBeNull();
  });
});
