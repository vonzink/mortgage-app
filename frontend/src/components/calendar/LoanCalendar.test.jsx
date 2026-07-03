import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

jest.mock('../../services/mortgageService', () => ({
  __esModule: true,
  default: { getBorrowerTracking: jest.fn() },
}));

import mortgageService from '../../services/mortgageService';
import LoanCalendar, { toEvents } from './LoanCalendar';

const ENTRIES = [
  { key: 'CLOSING_ESTIMATE', label: 'Closing Estimate', kind: 'DATE', value: '2099-08-15' },
  { key: 'APPRAISAL_CONTINGENCY', label: 'Appraisal Contingency', kind: 'DATE', value: '2099-08-15' },
  { key: 'FUNDING_ESTIMATE', label: 'Funding Estimate', kind: 'DATE', value: '2099-09-02' },
  { key: 'PROSPECT', label: 'Prospect', kind: 'DATETIME', value: '2026-06-26T16:52:26Z' },
  { key: 'APPLICATION_TAKEN', label: 'Application Taken', kind: 'DATE', value: null },
];

describe('toEvents', () => {
  test('keeps only dated entries and truncates timestamps to days', () => {
    expect(toEvents(ENTRIES)).toEqual([
      { dateKey: '2099-08-15', label: 'Closing Estimate' },
      { dateKey: '2099-08-15', label: 'Appraisal Contingency' },
      { dateKey: '2099-09-02', label: 'Funding Estimate' },
      { dateKey: '2026-06-26', label: 'Prospect' },
    ]);
  });
});

describe('LoanCalendar', () => {
  beforeEach(() => {
    mortgageService.getBorrowerTracking.mockResolvedValue(ENTRIES);
  });

  test('marks event days on the month grid and lists upcoming dates', async () => {
    render(<LoanCalendar suiteLoanId="L1" initialMonth="2099-08" />);
    await waitFor(() => expect(screen.getByTestId('calendar-month')).toHaveTextContent('August 2099'));

    const day = screen.getByTestId('calendar-day-2099-08-15');
    expect(day).toHaveAttribute('title', 'Closing Estimate, Appraisal Contingency');

    // Upcoming list (future-dated events, soonest first) — labels also render on day
    // cells, so match on count rather than uniqueness.
    expect(screen.getAllByText(/Closing Estimate/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Funding Estimate/).length).toBeGreaterThan(0);
  });

  test('month navigation moves the grid', async () => {
    render(<LoanCalendar suiteLoanId="L1" initialMonth="2099-08" />);
    await screen.findByTestId('calendar-month');
    fireEvent.click(screen.getByLabelText('Next month'));
    expect(screen.getByTestId('calendar-month')).toHaveTextContent('September 2099');
    expect(screen.getByTestId('calendar-day-2099-09-02')).toHaveAttribute('title', 'Funding Estimate');
  });

  test('empty tracking shows the friendly placeholder, never an error', async () => {
    mortgageService.getBorrowerTracking.mockResolvedValue([]);
    render(<LoanCalendar suiteLoanId="L1" initialMonth="2099-08" />);
    expect(await screen.findByText(/No upcoming dates yet/)).toBeInTheDocument();
  });
});
