import React from 'react';
import { render, screen } from '@testing-library/react';
import ClosingCostsCard from './ClosingCostsCard';

const FULL = {
  origination: 3000,
  services: 2500,
  taxesAndGov: 1200,
  prepaidsAndEscrow: 1800,
  other: 400,
  totalClosingCosts: 8900,
  sellerCredits: 5000,
  otherCredits: 250,
  estimatedCashToClose: 42350.75,
};

describe('ClosingCostsCard', () => {
  test('renders every category row with currency formatting', () => {
    render(<ClosingCostsCard closingCosts={FULL} />);
    expect(screen.getByText('Closing costs')).toBeInTheDocument();
    expect(screen.getByText('Origination')).toBeInTheDocument();
    expect(screen.getByText('$3,000.00')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    expect(screen.getByText('Taxes & government')).toBeInTheDocument();
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
    expect(screen.getByText('Prepaids & escrow')).toBeInTheDocument();
    expect(screen.getByText('$1,800.00')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.getByText('$400.00')).toBeInTheDocument();
    expect(screen.getByText('Seller credits')).toBeInTheDocument();
    expect(screen.getByText('$5,000.00')).toBeInTheDocument();
    expect(screen.getByText('Other credits')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
  });

  test('total row and cash line are both highlighted (.is-hl)', () => {
    const { container } = render(<ClosingCostsCard closingCosts={FULL} />);
    const hls = container.querySelectorAll('.lsc-kv.is-hl');
    expect(hls).toHaveLength(2);
    expect(hls[0].textContent).toMatch(/Total closing costs/);
    expect(hls[0].textContent).toMatch(/\$8,900\.00/);
    expect(hls[1].textContent).toMatch(/Estimated cash to close/);
    expect(hls[1].textContent).toMatch(/\$42,350\.75/);
  });

  test('negative estimatedCashToClose flips the label and shows the absolute value', () => {
    render(<ClosingCostsCard closingCosts={{ ...FULL, estimatedCashToClose: -1500 }} />);
    expect(screen.getByText('Estimated cash back to you')).toBeInTheDocument();
    expect(screen.getByText('$1,500.00')).toBeInTheDocument();
    expect(screen.queryByText('Estimated cash to close')).not.toBeInTheDocument();
  });

  test('zero estimatedCashToClose keeps the cash-to-close label', () => {
    render(<ClosingCostsCard closingCosts={{ ...FULL, estimatedCashToClose: 0 }} />);
    expect(screen.getByText('Estimated cash to close')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  test('null fields omit their rows (null-tolerant DTO contract)', () => {
    render(
      <ClosingCostsCard
        closingCosts={{
          origination: 3000, services: null, taxesAndGov: null, prepaidsAndEscrow: null,
          other: null, totalClosingCosts: 3000, sellerCredits: null, otherCredits: null,
          estimatedCashToClose: null,
        }}
      />,
    );
    expect(screen.getByText('Origination')).toBeInTheDocument();
    expect(screen.queryByText('Services')).not.toBeInTheDocument();
    expect(screen.queryByText('Seller credits')).not.toBeInTheDocument();
    expect(screen.queryByText(/Estimated cash/)).not.toBeInTheDocument();
    expect(screen.getByText('Total closing costs')).toBeInTheDocument();
  });

  test('renders nothing when every field is null (no empty shell)', () => {
    const allNull = Object.fromEntries(Object.keys(FULL).map((k) => [k, null]));
    const { container } = render(<ClosingCostsCard closingCosts={allNull} />);
    expect(container.querySelector('.lsc-card')).toBeNull();
  });

  test('renders nothing when closingCosts is null', () => {
    const { container } = render(<ClosingCostsCard closingCosts={null} />);
    expect(container.querySelector('.lsc-card')).toBeNull();
  });
});
