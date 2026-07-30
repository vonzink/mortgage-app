/**
 * Unit tests for mortgageService.getClientLoans — staff-only lookup of a client's whole
 * loan history (GET /api/borrowers/{borrowerId}/loans), used to power the client-aware
 * "Applications" nav item when staff are in client-view.
 *
 * Asserts the method GETs the exact suite path and unwraps the { success, data } envelope
 * into { accessible, restricted, totalMatched }, defaulting missing arrays/count to a safe
 * shape so the pages that .map() over them never see undefined. The HTTP layer (suiteClient)
 * is mocked, matching the convention in mortgageService.inviteCoBorrower.test.js.
 */
import mortgageService from './mortgageService';
import { suiteClient } from './apiClient';

jest.mock('./apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
  suiteClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));

afterEach(() => jest.clearAllMocks());

describe('mortgageService.getClientLoans (suite /borrowers/{id}/loans)', () => {
  test('GETs the right path and unwraps the envelope into the three fields', async () => {
    suiteClient.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          accessible: [
            {
              loanId: 'loan-1',
              loanNumber: 'L-1001',
              status: 'PROCESSING',
              primaryBorrowerName: 'Jane Doe',
              propertyCity: 'Denver',
              propertyState: 'CO',
              loanOfficerName: 'Pat Williams',
              updatedAt: '2026-07-20T00:00:00Z',
              matchedOn: 'account',
            },
          ],
          restricted: [
            {
              loanId: 'loan-2',
              loanNumber: 'L-2002',
              status: 'UNDERWRITING',
              primaryBorrowerName: 'Jane Doe',
              propertyCity: 'Boulder',
              propertyState: 'CO',
              loanOfficerName: 'Jane Smith',
              loanOfficerInactive: false,
              matchedOn: 'email',
            },
          ],
          totalMatched: 2,
        },
      },
    });

    const result = await mortgageService.getClientLoans('borrower-uuid-1');

    expect(suiteClient.get).toHaveBeenCalledWith('/borrowers/borrower-uuid-1/loans');
    expect(result).toEqual({
      accessible: [
        {
          loanId: 'loan-1',
          loanNumber: 'L-1001',
          status: 'PROCESSING',
          primaryBorrowerName: 'Jane Doe',
          propertyCity: 'Denver',
          propertyState: 'CO',
          loanOfficerName: 'Pat Williams',
          updatedAt: '2026-07-20T00:00:00Z',
          matchedOn: 'account',
        },
      ],
      restricted: [
        {
          loanId: 'loan-2',
          loanNumber: 'L-2002',
          status: 'UNDERWRITING',
          primaryBorrowerName: 'Jane Doe',
          propertyCity: 'Boulder',
          propertyState: 'CO',
          loanOfficerName: 'Jane Smith',
          loanOfficerInactive: false,
          matchedOn: 'email',
        },
      ],
      totalMatched: 2,
    });
  });

  test('a sparse payload yields safe empty defaults (never undefined.map at render time)', async () => {
    suiteClient.get.mockResolvedValue({
      data: { data: {} },
    });

    const result = await mortgageService.getClientLoans('borrower-uuid-2');

    expect(result).toEqual({ accessible: [], restricted: [], totalMatched: 0 });
  });

  test('propagates the suite error (e.g. non-staff caller gets a 403)', async () => {
    const err = new Error('forbidden');
    err.response = { data: { message: 'Staff only' } };
    suiteClient.get.mockRejectedValue(err);

    await expect(
      mortgageService.getClientLoans('borrower-uuid-3'),
    ).rejects.toThrow('forbidden');
  });
});

describe('mortgageService.createLoanForClient (suite POST /borrowers/{id}/loans)', () => {
  test('POSTs the right path with { loanPurpose } and returns the unwrapped result', async () => {
    suiteClient.post.mockResolvedValue({
      data: {
        success: true,
        data: { loanId: 'new-loan-uuid', loanNumber: 'LN-2026-0042' },
      },
    });

    const result = await mortgageService.createLoanForClient('borrower-uuid-1', 'PURCHASE');

    expect(suiteClient.post).toHaveBeenCalledWith(
      '/borrowers/borrower-uuid-1/loans',
      { loanPurpose: 'PURCHASE' },
    );
    expect(result).toEqual({ loanId: 'new-loan-uuid', loanNumber: 'LN-2026-0042' });
  });

  test('a rejected call propagates rather than resolving undefined', async () => {
    const err = new Error('Staff cannot reach this client');
    err.response = { data: { success: false, code: 'FORBIDDEN' } };
    suiteClient.post.mockRejectedValue(err);

    await expect(
      mortgageService.createLoanForClient('borrower-uuid-4', 'PURCHASE'),
    ).rejects.toThrow('Staff cannot reach this client');
  });
});
