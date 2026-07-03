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
});
