import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import StaffDocumentsPanel from './StaffDocumentsPanel';
import mortgageService from '../../services/mortgageService';
import { suiteLoanUrl } from '../../services/suiteWeb';

jest.mock('../../services/mortgageService', () => ({
  __esModule: true,
  default: {
    getStaffDocuments: jest.fn(),
    getStaffDocumentDownloadUrl: jest.fn(),
  },
}));

const ORIGINAL_ENV = process.env;

const DOCS = [
  {
    id: 'd-1',
    documentType: 'PAYSTUB',
    fileName: 'paystub-may.pdf',
    fileSize: 45000,
    documentStatus: 'ACCEPTED',
    uploadedBy: 'borrower-sub-1',
    createdAt: '2026-05-01T10:00:00Z',
  },
  {
    id: 'd-2',
    documentType: 'BANK_STATEMENT',
    fileName: 'bank-june.pdf',
    fileSize: 98000,
    documentStatus: 'READY_FOR_REVIEW',
    uploadedBy: 'borrower-sub-1',
    createdAt: '2026-06-15T10:00:00Z',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ORIGINAL_ENV, REACT_APP_SUITE_WEB_URL: 'https://suite.msfgco.com' };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

test('renders document rows newest-first with fileName, documentType, status pill, uploadedBy, and date', async () => {
  mortgageService.getStaffDocuments.mockResolvedValue({ count: 2, documents: DOCS });

  render(<StaffDocumentsPanel loanId="u-1" />);

  await waitFor(() => expect(mortgageService.getStaffDocuments).toHaveBeenCalledWith('u-1'));

  const rows = await screen.findAllByTestId('staff-doc-row');
  expect(rows).toHaveLength(2);

  // Newest first: bank-june (2026-06-15) before paystub-may (2026-05-01)
  expect(within(rows[0]).getByText(/bank-june\.pdf/)).toBeInTheDocument();
  expect(within(rows[0]).getByText(/BANK_STATEMENT/)).toBeInTheDocument();
  expect(within(rows[0]).getByText(/In review/i)).toBeInTheDocument();
  expect(within(rows[0]).getByText(/borrower-sub-1/)).toBeInTheDocument();
  expect(within(rows[0]).getByText(/6\/15\/2026/)).toBeInTheDocument();

  expect(within(rows[1]).getByText(/paystub-may\.pdf/)).toBeInTheDocument();
  expect(within(rows[1]).getByText(/PAYSTUB/)).toBeInTheDocument();
  expect(within(rows[1]).getByText(/Accepted/i)).toBeInTheDocument();
});

test('Download action fetches the download URL then opens it', async () => {
  mortgageService.getStaffDocuments.mockResolvedValue({ count: 2, documents: DOCS });
  mortgageService.getStaffDocumentDownloadUrl.mockResolvedValue({
    downloadUrl: 'https://s3.example.com/d-2', expiresInSeconds: 900,
  });
  const openSpy = jest.spyOn(window, 'open').mockImplementation(() => {});

  render(<StaffDocumentsPanel loanId="u-1" />);
  const rows = await screen.findAllByTestId('staff-doc-row');

  const downloadBtn = within(rows[0]).getByRole('button', { name: /download/i });
  downloadBtn.click();

  await waitFor(() => expect(mortgageService.getStaffDocumentDownloadUrl).toHaveBeenCalledWith('u-1', 'd-2'));
  await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://s3.example.com/d-2', '_blank', 'noopener,noreferrer'));

  openSpy.mockRestore();
});

test('renders a prominent Manage in Suite link from suiteLoanUrl, opening in a new tab safely', async () => {
  mortgageService.getStaffDocuments.mockResolvedValue({ count: 0, documents: [] });

  render(<StaffDocumentsPanel loanId="u-1" />);
  await waitFor(() => expect(mortgageService.getStaffDocuments).toHaveBeenCalled());

  const link = await screen.findByRole('link', { name: /manage in suite/i });
  expect(link).toHaveAttribute('href', suiteLoanUrl('u-1'));
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});

test('is read-only: no Upload/Delete/Review controls are rendered', async () => {
  mortgageService.getStaffDocuments.mockResolvedValue({ count: 2, documents: DOCS });

  render(<StaffDocumentsPanel loanId="u-1" />);
  await waitFor(() => expect(mortgageService.getStaffDocuments).toHaveBeenCalled());
  await screen.findAllByTestId('staff-doc-row');

  expect(screen.queryByRole('button', { name: /^upload/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^delete/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^review/i })).not.toBeInTheDocument();
});

test('renders an empty state when there are no documents', async () => {
  mortgageService.getStaffDocuments.mockResolvedValue({ count: 0, documents: [] });

  render(<StaffDocumentsPanel loanId="u-1" />);

  expect(await screen.findByText(/No documents yet — manage documents in the Suite console/i)).toBeInTheDocument();
});

test('renders a loading state before the fetch resolves', async () => {
  let resolveFn;
  mortgageService.getStaffDocuments.mockReturnValue(new Promise((resolve) => { resolveFn = resolve; }));

  render(<StaffDocumentsPanel loanId="u-1" />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  resolveFn({ count: 0, documents: [] });
  await screen.findByText(/No documents yet/i);
});

test('renders an error state when the fetch fails', async () => {
  mortgageService.getStaffDocuments.mockRejectedValue(new Error('network down'));
  jest.spyOn(console, 'error').mockImplementation(() => {});

  render(<StaffDocumentsPanel loanId="u-1" />);

  expect(await screen.findByText(/couldn.?t load documents/i)).toBeInTheDocument();
  console.error.mockRestore();
});
