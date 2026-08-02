import { renderHook } from '@testing-library/react';

// Mutable auth box so each test can vary the token's groups.
let mockProfile = {};
jest.mock('react-oidc-context', () => ({
  useAuth: () => ({ user: { profile: mockProfile } }),
}));

import useRoles from './useRoles';

// Group-less users ARE borrowers (2026-07-03): funnel signups get no Cognito group, and
// treating them as "neither borrower nor staff" routed real clients into the staff-ish
// default views (pipeline chrome, read-only staff documents panel). Least privilege =
// borrower, unless the token carries a staff or agent group.

describe('useRoles', () => {
  test('no groups at all → borrower, not staff (the funnel-signup case)', () => {
    mockProfile = {};
    const { result } = renderHook(() => useRoles());
    expect(result.current.isBorrower).toBe(true);
    expect(result.current.isStaff).toBe(false);
  });

  test('explicit Borrower group → borrower', () => {
    mockProfile = { 'cognito:groups': ['Borrower'] };
    const { result } = renderHook(() => useRoles());
    expect(result.current.isBorrower).toBe(true);
    expect(result.current.isStaff).toBe(false);
  });

  test('staff groups → staff, never default-borrower', () => {
    mockProfile = { 'cognito:groups': ['LO'] };
    const { result } = renderHook(() => useRoles());
    expect(result.current.isStaff).toBe(true);
    expect(result.current.isBorrower).toBe(false);
  });

  test('staff who ALSO carry Borrower keep the staff view', () => {
    mockProfile = { 'cognito:groups': ['Admin', 'Borrower'] };
    const { result } = renderHook(() => useRoles());
    expect(result.current.isStaff).toBe(true);
    // isBorrower stays true (they are on loans as a borrower too) — consumers gate on
    // isBorrower && !isStaff, which resolves to the staff view.
    expect(result.current.isBorrower).toBe(true);
  });

  test('agents are not default-borrowers', () => {
    mockProfile = { 'cognito:groups': ['RealEstateAgent'] };
    const { result } = renderHook(() => useRoles());
    expect(result.current.isBorrower).toBe(false);
    expect(result.current.isStaff).toBe(false);
  });

  // `isStaff` gates the staff surfaces here AND the "Edit in suite" link, so it must match
  // the suite's own STAFF set (SecurityConfig.STAFF = LO, PROCESSOR, UNDERWRITER, CLOSER,
  // MANAGER, ADMIN). Too narrow is the dangerous direction: isBorrower is "not staff and
  // not agent", so a missing group doesn't merely hide chrome — it reclassifies a
  // back-office user as a client.
  //
  // The literal strings are the live pool's (us-west-1_S6iE2uego), which mixes conventions:
  // Admin/LO/Processor/Manager are TitleCase, UNDERWRITER and CLOSER are upper. Normalizing
  // them "for tidiness" would silently unstaff two roles, so pin them exactly.
  describe('isStaff mirrors the suite STAFF set', () => {
    test.each(['Admin', 'LO', 'Processor', 'Manager', 'UNDERWRITER', 'CLOSER'])(
      '%s is staff, and therefore not a default-borrower',
      (group) => {
        mockProfile = { 'cognito:groups': [group] };
        const { result } = renderHook(() => useRoles());
        expect(result.current.isStaff).toBe(true);
        expect(result.current.isBorrower).toBe(false);
      },
    );

    // `External` exists in the pool and is deliberately NOT staff.
    test.each(['Borrower', 'RealEstateAgent', 'External'])('%s is not staff', (group) => {
      mockProfile = { 'cognito:groups': [group] };
      const { result } = renderHook(() => useRoles());
      expect(result.current.isStaff).toBe(false);
    });
  });
});
