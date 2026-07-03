import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import CalendarModal from './CalendarModal';

// Fixed "today" so month defaulting + urgency baselines are deterministic.
const NOW = new Date('2026-05-15T12:00:00Z');

const DATES = [
  { key: 'APP_SUBMITTED', label: 'Application submitted', date: '2026-06-02', urgent: false },
  { key: 'CONDITIONS_DUE', label: 'Conditions due', date: '2026-07-08', urgent: true },
  { key: 'CLOSING', label: 'Estimated closing', date: '2026-07-28', urgent: false },
];

describe('CalendarModal', () => {
  test('opens on the month of the earliest upcoming event', () => {
    render(<CalendarModal keyDates={DATES} now={NOW} onClose={() => {}} />);
    // earliest upcoming (>= 2026-05-15) is 2026-06-02 → June 2026
    expect(screen.getByText('June 2026')).toBeInTheDocument();
  });

  test('falls back to the current month when nothing is upcoming', () => {
    const past = [{ key: 'X', label: 'Old', date: '2026-01-10', urgent: false }];
    render(<CalendarModal keyDates={past} now={NOW} onClose={() => {}} />);
    expect(screen.getByText('May 2026')).toBeInTheDocument();
  });

  test('event days render a marker and the event list shows labels', () => {
    const { container } = render(<CalendarModal keyDates={DATES} now={NOW} onClose={() => {}} />);
    // June has one event (the 2nd) → one .ev day cell
    expect(container.querySelectorAll('.lsc-cal-day.ev').length).toBe(1);
    const list = container.querySelector('.lsc-cal-list');
    expect(within(list).getByText('Application submitted')).toBeInTheDocument();
  });

  test('urgent event gets the hot class in the grid and the list', () => {
    // navigate to July where the urgent "Conditions due" lives
    const { container } = render(<CalendarModal keyDates={DATES} now={NOW} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /next month/i }));
    expect(screen.getByText('July 2026')).toBeInTheDocument();
    expect(container.querySelector('.lsc-cal-day.ev.hot')).toBeInTheDocument();
    const hotEv = container.querySelector('.lsc-cal-ev.hot');
    expect(hotEv).toBeInTheDocument();
    expect(hotEv.textContent).toMatch(/Conditions due/);
  });

  test('Escape calls onClose', () => {
    const onClose = jest.fn();
    render(<CalendarModal keyDates={DATES} now={NOW} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('backdrop click calls onClose', () => {
    const onClose = jest.fn();
    const { container } = render(<CalendarModal keyDates={DATES} now={NOW} onClose={onClose} />);
    fireEvent.click(container.querySelector('.lsc-modal-bg'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('close button calls onClose', () => {
    const onClose = jest.fn();
    render(<CalendarModal keyDates={DATES} now={NOW} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('clicking inside the card does NOT call onClose', () => {
    const onClose = jest.fn();
    const { container } = render(<CalendarModal keyDates={DATES} now={NOW} onClose={onClose} />);
    fireEvent.click(container.querySelector('.lsc-modal'));
    expect(onClose).not.toHaveBeenCalled();
  });

  test('next month nav advances the header month', () => {
    render(<CalendarModal keyDates={DATES} now={NOW} onClose={() => {}} />);
    expect(screen.getByText('June 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next month/i }));
    expect(screen.getByText('July 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /previous month/i }));
    expect(screen.getByText('June 2026')).toBeInTheDocument();
  });
});
