import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import KeyDatesCard from './KeyDatesCard';

const DATES = [
  { key: 'CLOSING', label: 'Estimated closing', date: '2026-07-28', urgent: false },
  { key: 'CONDITIONS_DUE', label: 'Conditions due', date: '2026-07-08', urgent: false },
  { key: 'RATE_LOCK_EXPIRES', label: 'Rate lock expires', date: '2026-07-19', urgent: true },
];

describe('KeyDatesCard', () => {
  test('renders chips sorted ascending by date', () => {
    const { container } = render(<KeyDatesCard keyDates={DATES} />);
    const labels = [...container.querySelectorAll('.lsc-drow .lsc-drow-tx b')].map((n) => n.textContent);
    expect(labels).toEqual(['Conditions due', 'Rate lock expires', 'Estimated closing']);
  });

  test('renders UTC-safe day-number + short month in the chip', () => {
    render(<KeyDatesCard keyDates={DATES} />);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    // JUL appears for each chip
    expect(screen.getAllByText('JUL').length).toBe(3);
  });

  test('urgent entries get the hot class', () => {
    const { container } = render(<KeyDatesCard keyDates={DATES} />);
    const hot = container.querySelectorAll('.lsc-drow.is-hot');
    expect(hot.length).toBe(1);
    expect(hot[0].textContent).toMatch(/Rate lock expires/);
  });

  test('Open calendar button fires onOpenCalendar', () => {
    const onOpenCalendar = jest.fn();
    render(<KeyDatesCard keyDates={DATES} onOpenCalendar={onOpenCalendar} />);
    fireEvent.click(screen.getByRole('button', { name: /open calendar/i }));
    expect(onOpenCalendar).toHaveBeenCalledTimes(1);
  });

  test('renders nothing meaningful for empty dates but keeps the calendar button', () => {
    render(<KeyDatesCard keyDates={[]} onOpenCalendar={() => {}} />);
    expect(screen.getByRole('button', { name: /open calendar/i })).toBeInTheDocument();
  });
});
