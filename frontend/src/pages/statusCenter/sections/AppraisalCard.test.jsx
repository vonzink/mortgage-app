import React from 'react';
import { render, screen } from '@testing-library/react';
import AppraisalCard from './AppraisalCard';

describe('AppraisalCard', () => {
  test('fills N segments for N dated appraisal keys, in fixed order', () => {
    const keyDates = [
      { key: 'APPRAISAL_ORDERED', label: 'Ordered', date: '2026-07-03', urgent: false },
      { key: 'APPRAISAL_SCHEDULED', label: 'Scheduled', date: '2026-07-05', urgent: false },
      { key: 'CLOSING', label: 'Closing', date: '2026-07-28', urgent: false },
    ];
    const { container } = render(<AppraisalCard keyDates={keyDates} purchasePrice={675000} />);
    const segs = container.querySelectorAll('.lsc-appr-steps i');
    expect(segs.length).toBe(4);
    // Ordered + Scheduled filled; Inspected + Report empty
    expect(segs[0].classList.contains('is-on')).toBe(true);
    expect(segs[1].classList.contains('is-on')).toBe(true);
    expect(segs[2].classList.contains('is-on')).toBe(false);
    expect(segs[3].classList.contains('is-on')).toBe(false);
  });

  test('shows no filled segments when no appraisal keys have dates', () => {
    const { container } = render(<AppraisalCard keyDates={[]} purchasePrice={675000} />);
    const on = container.querySelectorAll('.lsc-appr-steps i.is-on');
    expect(on.length).toBe(0);
  });

  test('appraised value stays Pending until report received', () => {
    const beforeReport = [
      { key: 'APPRAISAL_ORDERED', date: '2026-07-03' },
      { key: 'APPRAISAL_INSPECTED', date: '2026-07-14' },
    ];
    render(<AppraisalCard keyDates={beforeReport} purchasePrice={675000} />);
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  test('renders purchase price as currency', () => {
    render(<AppraisalCard keyDates={[]} purchasePrice={675000} />);
    expect(screen.getByText('$675,000.00')).toBeInTheDocument();
  });

  test('four filled segments once the report is received', () => {
    const done = [
      { key: 'APPRAISAL_ORDERED', date: '2026-07-03' },
      { key: 'APPRAISAL_SCHEDULED', date: '2026-07-05' },
      { key: 'APPRAISAL_INSPECTED', date: '2026-07-14' },
      { key: 'APPRAISAL_REPORT_RECEIVED', date: '2026-07-18' },
    ];
    const { container } = render(<AppraisalCard keyDates={done} purchasePrice={675000} />);
    expect(container.querySelectorAll('.lsc-appr-steps i.is-on').length).toBe(4);
  });
});
