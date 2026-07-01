/**
 * Unit tests for the msfg-suite borrower re-point slice in mortgageService.
 *
 * Covers the envelope-unwrap + field-mapping for the two borrower read screens:
 *   - getApplications()  → suite GET /api/me/loans   (paged list)
 *   - getApplication(id) → suite GET /api/loans/{id} (loan detail)
 *   - getStatusHistory(id) → suite GET /api/loans/{id}/status/history (real timeline)
 *
 * The HTTP layer (apiClient) is mocked; we feed sample suite responses and assert
 * the adapted output matches the shapes the existing React components consume.
 */
import mortgageService, {
  adaptSuiteLoanList,
  adaptSuiteLoanDetail,
} from './mortgageService';
import { suiteClient } from './apiClient';

vi.mock('./apiClient', () => ({
  __esModule: true,
  default: { get: vi.fn(), post: vi.fn() },
  suiteClient: { get: vi.fn(), post: vi.fn() },
}));

afterEach(() => vi.clearAllMocks());

// ── Sample suite responses (shaped per the suite contract) ────────────────────

const sampleMeLoansEnvelope = {
  success: true,
  data: {
    items: [
      {
        id: '11111111-1111-1111-1111-111111111111',
        loanNumber: 'LN-1001',
        status: 'IN_UNDERWRITING',
        loanOfficerId: 'lo-uuid-1',
        primaryBorrowerName: 'Jane Borrower',
        propertyCity: 'Austin',
        propertyState: 'TX',
        updatedAt: '2026-06-20T12:00:00Z',
      },
      {
        // Sparse item: no property, no borrower name → nulls tolerated.
        id: '22222222-2222-2222-2222-222222222222',
        loanNumber: 'LN-1002',
        status: 'STARTED',
        loanOfficerId: 'lo-uuid-2',
        primaryBorrowerName: null,
        propertyCity: null,
        propertyState: null,
        updatedAt: '2026-06-19T08:30:00Z',
      },
    ],
    page: 0,
    size: 20,
    total: 2,
    totalPages: 1,
  },
};

const sampleLoanByIdEnvelope = {
  success: true,
  data: {
    id: '11111111-1111-1111-1111-111111111111',
    loanNumber: 'LN-1001',
    status: 'IN_UNDERWRITING',
    loanPurpose: 'PURCHASE',
    mortgageType: 'CONVENTIONAL',
    noteAmount: 405000,
    loanOfficerId: 'lo-uuid-1',
    propertyCity: 'Austin',
    propertyState: 'TX',
    baseLoanAmount: 400000,
    salesPrice: 500000,
    appraisedValue: 510000,
    estimatedValue: 505000,
    propertyType: 'SINGLE_FAMILY',
    addressLine1: '123 Main St',
    addressLine2: 'Apt 4',
    postalCode: '78701',
    consummationDate: '2026-07-15',
  },
};

// ── getApplications (LIST) ────────────────────────────────────────────────────

describe('mortgageService.getApplications (suite /api/me/loans)', () => {
  test('hits the suite me/loans endpoint and adapts the paged envelope', async () => {
    suiteClient.get.mockResolvedValue({ data: sampleMeLoansEnvelope });

    const result = await mortgageService.getApplications();

    expect(suiteClient.get).toHaveBeenCalledWith('/me/loans');
    expect(result).toEqual({
      content: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          borrowerName: 'Jane Borrower',
          applicationNumber: 'LN-1001',
          city: 'Austin',
          state: 'TX',
          status: 'IN_UNDERWRITING',
          statusChangedAt: '2026-06-20T12:00:00Z',
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          borrowerName: null,
          applicationNumber: 'LN-1002',
          city: null,
          state: null,
          status: 'STARTED',
          statusChangedAt: '2026-06-19T08:30:00Z',
        },
      ],
      totalElements: 2,
      totalPages: 1,
      page: 0,
      size: 20,
    });
  });

  test('forwards the legacy filter query string to me/loans', async () => {
    suiteClient.get.mockResolvedValue({ data: sampleMeLoansEnvelope });
    await mortgageService.getApplications('page=1&size=25');
    expect(suiteClient.get).toHaveBeenCalledWith('/me/loans?page=1&size=25');
  });

  test('does NOT invent staff-only row fields (omitted → undefined)', async () => {
    suiteClient.get.mockResolvedValue({ data: sampleMeLoansEnvelope });
    const { content } = await mortgageService.getApplications();
    const row = content[0];
    expect(row.loanAmount).toBeUndefined();
    expect(row.outstandingConditions).toBeUndefined();
    expect(row.ltvPct).toBeUndefined();
    expect(row.estClosingDate).toBeUndefined();
    expect(row.assignedLoName).toBeUndefined();
  });
});

describe('adaptSuiteLoanList (pure)', () => {
  test('renames items→content, total→totalElements and per-item fields', () => {
    const out = adaptSuiteLoanList(sampleMeLoansEnvelope);
    expect(out.content).toHaveLength(2);
    expect(out.totalElements).toBe(2);
    expect(out.content[0].borrowerName).toBe('Jane Borrower');
    expect(out.content[0].applicationNumber).toBe('LN-1001');
  });

  test('coalesces size from pageSize when size is absent', () => {
    const payload = {
      success: true,
      data: { items: [], total: 0, totalPages: 0, page: 0, pageSize: 50 },
    };
    expect(adaptSuiteLoanList(payload).size).toBe(50);
  });

  test('empty / missing items yields empty content with zero totals', () => {
    expect(adaptSuiteLoanList({ success: true, data: {} })).toEqual({
      content: [],
      totalElements: 0,
      totalPages: 1,
      page: 0,
      size: 0,
    });
  });
});

// ── getApplication (DETAIL) ───────────────────────────────────────────────────

describe('mortgageService.getApplication (suite /api/loans/{id})', () => {
  test('hits the suite loans/{id} endpoint and reshapes the flat payload', async () => {
    suiteClient.get.mockResolvedValue({ data: sampleLoanByIdEnvelope });

    const app = await mortgageService.getApplication(
      '11111111-1111-1111-1111-111111111111',
    );

    expect(suiteClient.get).toHaveBeenCalledWith(
      '/loans/11111111-1111-1111-1111-111111111111',
    );
    expect(app.id).toBe('11111111-1111-1111-1111-111111111111');
    expect(app.applicationNumber).toBe('LN-1001');
    expect(app.status).toBe('IN_UNDERWRITING');
    expect(app.loanPurpose).toBe('PURCHASE');
    // mortgageType → loanType
    expect(app.loanType).toBe('CONVENTIONAL');
    // baseLoanAmount preferred over noteAmount
    expect(app.loanAmount).toBe(400000);
    // appraisedValue wins the property-value coalesce
    expect(app.propertyValue).toBe(510000);
    // nested property{} built from flat fields
    expect(app.property).toEqual({
      addressLine: '123 Main St Apt 4',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      propertyType: 'SINGLE_FAMILY',
      constructionType: null,
      yearBuilt: null,
    });
    // no parties data this slice
    expect(app.borrowers).toEqual([]);
  });

  test('borrowers[0] chaining is safe (no parties data)', async () => {
    suiteClient.get.mockResolvedValue({ data: sampleLoanByIdEnvelope });
    const app = await mortgageService.getApplication('id');
    expect(app.borrowers?.[0]).toBeUndefined();
  });
});

describe('adaptSuiteLoanDetail (pure)', () => {
  test('falls back to noteAmount when baseLoanAmount absent', () => {
    const out = adaptSuiteLoanDetail({
      success: true,
      data: { id: 'x', loanNumber: 'L', noteAmount: 222 },
    });
    expect(out.loanAmount).toBe(222);
  });

  test('propertyValue falls back estimatedValue then salesPrice', () => {
    const estOnly = adaptSuiteLoanDetail({
      success: true,
      data: { id: 'x', estimatedValue: 99 },
    });
    expect(estOnly.propertyValue).toBe(99);
    const salesOnly = adaptSuiteLoanDetail({
      success: true,
      data: { id: 'x', salesPrice: 77 },
    });
    expect(salesOnly.propertyValue).toBe(77);
  });

  test('addressLine uses only addressLine1 when line2 absent; null when both absent', () => {
    expect(
      adaptSuiteLoanDetail({ success: true, data: { addressLine1: '1 A St' } }).property
        .addressLine,
    ).toBe('1 A St');
    expect(
      adaptSuiteLoanDetail({ success: true, data: {} }).property.addressLine,
    ).toBeNull();
  });

  test('null money fields coalesce to null (component coalesces to 0 before formatCurrency)', () => {
    const out = adaptSuiteLoanDetail({ success: true, data: { id: 'x' } });
    expect(out.loanAmount).toBeNull();
    expect(out.propertyValue).toBeNull();
  });
});

// ── getStatusHistory (real timeline) ──────────────────────────────────────────

describe('mortgageService.getStatusHistory (suite /loans/{id}/status/history)', () => {
  test('returns the milestone timeline from status/history (oldest-first)', async () => {
    const timeline = [
      { id: 'h1', status: 'STARTED', transitionedAt: '2026-06-18T09:00:00Z' },
      { id: 'h2', status: 'IN_UNDERWRITING', transitionedAt: '2026-06-20T12:00:00Z' },
    ];
    suiteClient.get.mockResolvedValue({ data: { success: true, data: timeline } });

    const history = await mortgageService.getStatusHistory('loan-1');

    expect(suiteClient.get).toHaveBeenCalledWith('/loans/loan-1/status/history');
    expect(history).toEqual(timeline);
  });

  test('returns [] when the timeline is not an array', async () => {
    suiteClient.get.mockResolvedValue({ data: { success: true, data: {} } });
    expect(await mortgageService.getStatusHistory('loan-1')).toEqual([]);
  });

  test('returns [] on request failure (never throws)', async () => {
    suiteClient.get.mockRejectedValue(new Error('boom'));
    expect(await mortgageService.getStatusHistory('loan-1')).toEqual([]);
  });
});
