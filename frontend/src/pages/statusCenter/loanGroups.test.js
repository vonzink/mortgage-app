import { groupLoans, TERMINAL_STATUSES } from './loanGroups';

const NOW = new Date('2026-07-03T00:00:00Z');
const mk = (id, status, statusChangedAt) => ({ id, status, statusChangedAt });

describe('groupLoans', () => {
  test('active loans first, terminal loans in past, >12mo past behind older', () => {
    const loans = [
      mk('a', 'IN_UNDERWRITING', '2026-06-01T00:00:00Z'),
      mk('b', 'FUNDED', '2026-03-01T00:00:00Z'),          // past, recent
      mk('c', 'WITHDRAWN', '2025-05-01T00:00:00Z'),        // past, >12mo → older
      mk('d', 'STARTED', '2026-07-01T00:00:00Z'),
    ];
    const g = groupLoans(loans, NOW);
    expect(g.active.map((l) => l.id)).toEqual(['d', 'a']);       // newest change first
    expect(g.past.map((l) => l.id)).toEqual(['b']);
    expect(g.older.map((l) => l.id)).toEqual(['c']);
  });

  test('terminal set covers funded/withdrawn/denied/cancelled', () => {
    expect([...TERMINAL_STATUSES].sort()).toEqual(['CANCELLED', 'DENIED', 'FUNDED', 'WITHDRAWN']);
  });

  test('missing statusChangedAt counts as recent (never silently hidden)', () => {
    const g = groupLoans([mk('x', 'FUNDED', null)], NOW);
    expect(g.past.map((l) => l.id)).toEqual(['x']);
  });
});
