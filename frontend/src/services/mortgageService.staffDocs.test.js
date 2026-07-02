/**
 * Unit tests for the msfg-suite STAFF documents read-only slice in mortgageService.
 *
 * Staff no longer manage documents through the old mortgage-app WorkspaceTab — the suite is the
 * system of record, so staff get a read-only view backed directly by the suite's staff document
 * endpoints:
 *   - getStaffDocuments(loanId)              → suite GET /loans/{id}/documents
 *   - getStaffDocumentDownloadUrl(loanId,id) → suite GET /loans/{id}/documents/{docId}/download-url
 *
 * The HTTP layer (apiClient/suiteClient) is mocked; we assert the request shape and the
 * envelope-unwrap of the response.
 */
import mortgageService, { adaptSuiteDocument } from './mortgageService';
import { suiteClient } from './apiClient';

jest.mock('./apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
  suiteClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));

afterEach(() => jest.clearAllMocks());

describe('getStaffDocuments', () => {
  test('calls the suite staff documents endpoint and returns the unwrapped {count, documents}', async () => {
    const documents = [
      {
        id: 'd-1',
        documentType: 'PAYSTUB',
        documentTypeId: 3,
        fileName: 'paystub.pdf',
        fileSize: 12345,
        contentType: 'application/pdf',
        partyRole: 'borrower',
        documentStatus: 'ACCEPTED',
        folderId: null,
        description: null,
        uploadedBy: 'borrower-sub',
        reviewedBy: null,
        reviewerNotes: null,
        reviewedAt: null,
        createdAt: '2026-06-20T12:00:00Z',
        updatedAt: '2026-06-20T12:00:00Z',
      },
    ];
    suiteClient.get.mockResolvedValue({
      data: { success: true, data: { count: 1, documents } },
    });

    const result = await mortgageService.getStaffDocuments('u-1');

    expect(suiteClient.get).toHaveBeenCalledWith('/loans/u-1/documents');
    expect(result).toEqual({ count: 1, documents });
  });

  test('tolerates a bare (non-enveloped) payload', async () => {
    suiteClient.get.mockResolvedValue({ data: { count: 0, documents: [] } });

    const result = await mortgageService.getStaffDocuments('u-2');

    expect(result).toEqual({ count: 0, documents: [] });
  });
});

describe('adaptSuiteDocument (pure) — fromLoanTeam flag', () => {
  test('carries fromLoanTeam: true through for a staff-shared document', () => {
    const out = adaptSuiteDocument({ id: 'd-1', fileName: 'w2.pdf', documentStatus: 'ACCEPTED', fromLoanTeam: true });
    expect(out.fromLoanTeam).toBe(true);
  });

  test('normalizes to fromLoanTeam: false when the field is absent (borrower\'s own upload)', () => {
    const out = adaptSuiteDocument({ id: 'd-2', fileName: 'paystub.pdf', documentStatus: 'UPLOADED' });
    expect(out.fromLoanTeam).toBe(false);
  });

  test('normalizes to fromLoanTeam: false when the field is explicitly false', () => {
    const out = adaptSuiteDocument({ id: 'd-3', fileName: 'id.pdf', documentStatus: 'UPLOADED', fromLoanTeam: false });
    expect(out.fromLoanTeam).toBe(false);
  });
});

describe('getStaffDocumentDownloadUrl', () => {
  test('calls the suite staff download-url endpoint and returns the unwrapped payload', async () => {
    suiteClient.get.mockResolvedValue({
      data: { success: true, data: { downloadUrl: 'https://s3.example.com/d-1', expiresInSeconds: 900 } },
    });

    const result = await mortgageService.getStaffDocumentDownloadUrl('u-1', 'd-1');

    expect(suiteClient.get).toHaveBeenCalledWith('/loans/u-1/documents/d-1/download-url');
    expect(result).toEqual({ downloadUrl: 'https://s3.example.com/d-1', expiresInSeconds: 900 });
  });
});
