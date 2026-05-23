import { pushRecentLoan, getRecentLoans, clearRecentLoans, RECENT_LOANS_KEY } from './recentLoans';

beforeEach(() => {
  window.localStorage.clear();
});

describe('recentLoans', () => {
  test('getRecentLoans returns [] when storage empty', () => {
    expect(getRecentLoans()).toEqual([]);
  });

  test('pushRecentLoan stores the loan and getRecentLoans returns it', () => {
    pushRecentLoan({ id: 7, applicationNumber: 'APP-007', borrowerName: 'Fortney, Matthew' });
    const recents = getRecentLoans();
    expect(recents).toHaveLength(1);
    expect(recents[0]).toMatchObject({ id: 7, applicationNumber: 'APP-007', borrowerName: 'Fortney, Matthew' });
    expect(recents[0].openedAt).toEqual(expect.any(Number));
  });

  test('pushRecentLoan dedupes by id, keeping the latest', () => {
    pushRecentLoan({ id: 7, applicationNumber: 'APP-007', borrowerName: 'A' });
    pushRecentLoan({ id: 8, applicationNumber: 'APP-008', borrowerName: 'B' });
    pushRecentLoan({ id: 7, applicationNumber: 'APP-007', borrowerName: 'A renamed' });
    const recents = getRecentLoans();
    expect(recents.map(r => r.id)).toEqual([7, 8]);
    expect(recents[0].borrowerName).toBe('A renamed');
  });

  test('pushRecentLoan caps at 10', () => {
    for (let i = 0; i < 12; i++) {
      pushRecentLoan({ id: i, applicationNumber: `APP-${i}`, borrowerName: `B${i}` });
    }
    expect(getRecentLoans()).toHaveLength(10);
    expect(getRecentLoans()[0].id).toBe(11);
    expect(getRecentLoans().map(r => r.id)).not.toContain(0);
  });

  test('clearRecentLoans empties the cache', () => {
    pushRecentLoan({ id: 1, applicationNumber: 'a', borrowerName: 'b' });
    clearRecentLoans();
    expect(getRecentLoans()).toEqual([]);
  });

  test('survives corrupt JSON in storage', () => {
    window.localStorage.setItem(RECENT_LOANS_KEY, '{not valid json');
    expect(getRecentLoans()).toEqual([]);
  });

  test('ignores pushRecentLoan with missing id', () => {
    pushRecentLoan({ applicationNumber: 'APP-X' });
    expect(getRecentLoans()).toEqual([]);
  });
});
