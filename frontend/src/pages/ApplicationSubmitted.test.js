import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

jest.mock('../services/mortgageService', () => ({
  __esModule: true,
  default: { getApplications: jest.fn() },
}));

import mortgageService from '../services/mortgageService';
import ApplicationSubmitted from './ApplicationSubmitted';

function renderPage(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/application-submitted', state }]}>
      <Routes>
        <Route path="/application-submitted" element={<ApplicationSubmitted />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ApplicationSubmitted', () => {
  beforeEach(() => {
    mortgageService.getApplications.mockResolvedValue({
      content: [{ id: 'SUITE-1', loanNumber: '1000000042' }],
    });
  });

  test('thanks the borrower, shows next steps, docs to gather, and the upload CTA', async () => {
    renderPage({ suiteLoanId: 'SUITE-1' });

    expect(screen.getByText(/thank you — your application is in/i)).toBeInTheDocument();
    expect(await screen.findByTestId('application-number')).toHaveTextContent('1000000042');
    expect(screen.getByText(/we review your application/i)).toBeInTheDocument();
    expect(screen.getByText(/last 2 pay stubs/i)).toBeInTheDocument();

    const cta = screen.getByTestId('upload-documents-cta');
    expect(cta).toHaveAttribute('href', '/dashboard?loan=SUITE-1');
  });

  test('without a loan id it still renders and points at My applications', () => {
    renderPage(undefined);
    expect(screen.getByText(/thank you — your application is in/i)).toBeInTheDocument();
    expect(screen.getByTestId('upload-documents-cta')).toHaveAttribute('href', '/applications');
  });
});
