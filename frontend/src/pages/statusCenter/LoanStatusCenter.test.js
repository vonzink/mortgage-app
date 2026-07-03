import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

jest.mock('../../services/mortgageService', () => ({
  __esModule: true,
  default: {
    getApplications: jest.fn(),
    getBorrowerDashboard: jest.fn(),
  },
}));

import mortgageService from '../../services/mortgageService';
import LoanStatusCenter from './LoanStatusCenter';

const ACTIVE_LOAN = {
  id: 'suite-1',
  applicationNumber: '1000000042',
  status: 'IN_UNDERWRITING',
  city: 'Aurora',
  state: 'CO',
  statusChangedAt: '2026-06-29T12:00:00Z',
};
const PAST_LOAN = {
  id: 'suite-2',
  applicationNumber: '1000000007',
  status: 'FUNDED',
  city: 'Lehi',
  state: 'UT',
  statusChangedAt: '2026-05-01T12:00:00Z',
};

const DASHBOARD = {
  status: 'IN_UNDERWRITING',
  property: { addressLine1: '123 Main St', city: 'Aurora', state: 'CO' },
};

function renderPage(initialEntry = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/dashboard" element={<LoanStatusCenter />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mortgageService.getApplications.mockResolvedValue({ content: [ACTIVE_LOAN] });
  mortgageService.getBorrowerDashboard.mockResolvedValue(DASHBOARD);
});

describe('LoanStatusCenter', () => {
  test('with ONE loan: no selector, dashboard fetched for its id, hero renders address', async () => {
    renderPage();

    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard).toHaveBeenCalledWith('suite-1'),
    );
    expect(await screen.findByText(/123 Main St/)).toBeInTheDocument();
    // With a single loan there is no picker (the <select> combobox).
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /loan status center/i })).toBeInTheDocument();
  });

  test('with TWO loans: selector rendered, defaults to the active loan', async () => {
    mortgageService.getApplications.mockResolvedValue({ content: [PAST_LOAN, ACTIVE_LOAN] });

    renderPage();

    expect(await screen.findByRole('combobox')).toBeInTheDocument();
    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard).toHaveBeenCalledWith('suite-1'),
    );
  });

  test('?loan= param wins over the default selection', async () => {
    mortgageService.getApplications.mockResolvedValue({ content: [ACTIVE_LOAN, PAST_LOAN] });

    renderPage('/dashboard?loan=suite-2');

    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard).toHaveBeenCalledWith('suite-2'),
    );
    expect(mortgageService.getBorrowerDashboard).not.toHaveBeenCalledWith('suite-1');
  });

  test('picking a loan in the selector re-fetches the dashboard for it', async () => {
    mortgageService.getApplications.mockResolvedValue({ content: [ACTIVE_LOAN, PAST_LOAN] });

    renderPage();
    const select = await screen.findByRole('combobox');
    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard).toHaveBeenCalledWith('suite-1'),
    );

    fireEvent.change(select, { target: { value: 'suite-2' } });
    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard).toHaveBeenCalledWith('suite-2'),
    );
  });

  test('error state renders a dismissable banner with retry', async () => {
    // getBorrowerDashboard resolves null on failure (the service swallows errors).
    mortgageService.getBorrowerDashboard.mockResolvedValue(null);

    renderPage();

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent(/couldn.t load/i);

    // Retry re-fetches; a success clears the banner.
    mortgageService.getBorrowerDashboard.mockResolvedValue(DASHBOARD);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  test('grid skeleton columns render after load', async () => {
    const { container } = renderPage();
    await screen.findByText(/123 Main St/);
    expect(container.querySelector('.lsc-grid')).toBeInTheDocument();
    expect(container.querySelector('.lsc-rail-col')).toBeInTheDocument();
    expect(container.querySelector('.lsc-main-col')).toBeInTheDocument();
    expect(container.querySelector('.lsc-side-col')).toBeInTheDocument();
  });
});
