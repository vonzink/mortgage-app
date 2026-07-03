import React from 'react';
import { render, screen } from '@testing-library/react';
import RateLockCard, { RING_CIRCUMFERENCE } from './RateLockCard';

// Fixed "today" baseline so daysLeft is deterministic regardless of run date.
const NOW = new Date('2026-07-02T15:00:00Z');

const LOCKED = {
  status: 'LOCKED',
  noteRate: 5.99,
  lockedAt: '2026-06-19',
  expiresAt: '2026-07-19', // 17 days out from Jul 2
  lockDays: 30,
};

describe('RateLockCard', () => {
  test('shows daysLeft computed from expiresAt at UTC midnight', () => {
    render(<RateLockCard rateLock={LOCKED} now={NOW} />);
    // Jul 19 - Jul 2 = 17
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText(/days left/i)).toBeInTheDocument();
  });

  test('renders the note rate and UTC-safe locked/expires dates', () => {
    render(<RateLockCard rateLock={LOCKED} now={NOW} />);
    expect(screen.getByText(/5\.990%/)).toBeInTheDocument();
    expect(screen.getByText(/Jun 19/)).toBeInTheDocument();
    expect(screen.getByText(/Jul 19/)).toBeInTheDocument();
    // no off-by-one: never Jul 18 / Jun 18
    expect(screen.queryByText(/Jul 18/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Jun 18/)).not.toBeInTheDocument();
  });

  test('is NOT urgent when more than 5 days remain', () => {
    const { container } = render(<RateLockCard rateLock={LOCKED} now={NOW} />);
    expect(container.querySelector('.lsc-lockcard.is-urgent')).toBeNull();
  });

  test('adds the urgent class when 5 or fewer days remain', () => {
    const soon = { ...LOCKED, expiresAt: '2026-07-06' }; // 4 days out
    const { container } = render(<RateLockCard rateLock={soon} now={NOW} />);
    expect(container.querySelector('.lsc-lockcard.is-urgent')).not.toBeNull();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  test('EXPIRED status shows the "Lock expired" state instead of a countdown', () => {
    const expired = { ...LOCKED, status: 'EXPIRED', expiresAt: '2026-06-25' };
    const { container } = render(<RateLockCard rateLock={expired} now={NOW} />);
    expect(screen.getByText(/lock expired/i)).toBeInTheDocument();
    expect(screen.queryByText(/days left/i)).not.toBeInTheDocument();
    expect(container.querySelector('.lsc-lockcard.is-urgent')).not.toBeNull();
  });

  test('daysLeft <= 0 (past expiry, still LOCKED) also shows the expired state', () => {
    const past = { ...LOCKED, expiresAt: '2026-07-01' }; // yesterday
    render(<RateLockCard rateLock={past} now={NOW} />);
    expect(screen.getByText(/lock expired/i)).toBeInTheDocument();
  });

  test('ring arc fraction reflects daysLeft/lockDays via stroke-dashoffset', () => {
    const { container } = render(<RateLockCard rateLock={LOCKED} now={NOW} />);
    // progress circle = second circle in the svg
    const circles = container.querySelectorAll('.lsc-lockring circle');
    const progress = circles[circles.length - 1];
    const fraction = 17 / 30;
    const expectedOffset = RING_CIRCUMFERENCE * (1 - fraction);
    const actual = parseFloat(progress.getAttribute('stroke-dashoffset'));
    expect(actual).toBeCloseTo(expectedOffset, 1);
    expect(parseFloat(progress.getAttribute('stroke-dasharray'))).toBeCloseTo(RING_CIRCUMFERENCE, 1);
  });
});
