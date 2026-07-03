import React from 'react';
import { render, screen } from '@testing-library/react';
import PaymentCard from './PaymentCard';

const FULL = {
  principalAndInterest: 3503.98,
  taxes: 520,
  hazardInsurance: 300,
  mortgageInsurance: 238.25,
  hoa: 85,
  total: 4647.23,
};

describe('PaymentCard', () => {
  test('renders each non-null component as currency', () => {
    render(<PaymentCard payment={FULL} />);
    expect(screen.getByText('$3,503.98')).toBeInTheDocument();
    expect(screen.getByText('$520.00')).toBeInTheDocument();
    expect(screen.getByText('$300.00')).toBeInTheDocument();
    expect(screen.getByText('$238.25')).toBeInTheDocument();
    expect(screen.getByText('$85.00')).toBeInTheDocument();
  });

  test('the total row gets the highlighted hl class', () => {
    const { container } = render(<PaymentCard payment={FULL} />);
    const hl = container.querySelector('.lsc-kv.is-hl');
    expect(hl).not.toBeNull();
    expect(hl.textContent).toMatch(/Total/);
    expect(hl.textContent).toMatch(/\$4,647\.23/);
  });

  test('null component rows are omitted', () => {
    render(
      <PaymentCard
        payment={{ principalAndInterest: 3503.98, taxes: null, hazardInsurance: null, mortgageInsurance: null, hoa: null, total: 3503.98 }}
      />,
    );
    expect(screen.getByText(/Principal & interest/)).toBeInTheDocument();
    expect(screen.queryByText(/Property taxes/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hazard insurance/)).not.toBeInTheDocument();
    expect(screen.queryByText(/HOA/)).not.toBeInTheDocument();
  });

  test('renders nothing when payment is null', () => {
    const { container } = render(<PaymentCard payment={null} />);
    expect(container.querySelector('.lsc-card')).toBeNull();
  });
});
