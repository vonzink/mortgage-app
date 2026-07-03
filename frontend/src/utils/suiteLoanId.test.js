import { resolveSuiteLoanId } from './suiteLoanId';

// The /applications/:id route is fed from two worlds: suite-first navigation passes the suite
// loan UUID; legacy lists pass the numeric mortgage-app id. Suite-keyed calls (documents,
// status history, console links) must always get the SUITE id — via the loaded application's
// suiteLoanId when the route id is legacy-numeric.

const UUID = '632364d7-7b81-44b9-8d9d-a3596bdec30a';

describe('resolveSuiteLoanId', () => {
  test('route id that is a suite UUID wins, even before the application loads', () => {
    expect(resolveSuiteLoanId(UUID, null)).toBe(UUID);
    expect(resolveSuiteLoanId(UUID.toUpperCase(), null)).toBe(UUID.toUpperCase());
  });

  test('numeric legacy route id falls back to the loaded application suiteLoanId', () => {
    expect(resolveSuiteLoanId('123', { suiteLoanId: UUID })).toBe(UUID);
  });

  test('no suite link anywhere resolves to null (suite features disabled, not broken)', () => {
    expect(resolveSuiteLoanId('123', { suiteLoanId: null })).toBeNull();
    expect(resolveSuiteLoanId('123', null)).toBeNull();
    expect(resolveSuiteLoanId(undefined, undefined)).toBeNull();
  });

  test('non-UUID non-numeric ids are not mistaken for suite ids', () => {
    expect(resolveSuiteLoanId('loan-123', { suiteLoanId: UUID })).toBe(UUID);
    expect(resolveSuiteLoanId('search', null)).toBeNull();
  });
});
