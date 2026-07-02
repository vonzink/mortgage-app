import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardHero } from './DashboardChrome';

const baseProps = {
  applicationNumber: '1',
  borrowerName: 'B',
  status: 'X',
  statusLabel: 'X',
};

describe('DashboardHero — Open in Suite link', () => {
  test('renders an external anchor when suiteHref is set', () => {
    render(
      <MemoryRouter>
        <DashboardHero {...baseProps} suiteHref="https://suite.msfgco.com/loans/abc" />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /Open in Suite/ });
    expect(link).toHaveAttribute('href', 'https://suite.msfgco.com/loans/abc');
    expect(link).toHaveAttribute('target', '_blank');
  });

  test('absent without suiteHref', () => {
    render(<MemoryRouter><DashboardHero {...baseProps} /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: /Open in Suite/ })).not.toBeInTheDocument();
  });
});
