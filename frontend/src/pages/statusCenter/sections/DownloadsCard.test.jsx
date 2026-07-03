import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DownloadsCard from './DownloadsCard';
import mortgageService from '../../../services/mortgageService';

jest.mock('../../../services/mortgageService', () => ({
  __esModule: true,
  default: { getBorrowerDocumentDownloadUrl: jest.fn() },
}));

const FROM_TEAM = [
  { id: 'f1', fileName: 'appraisal_report.pdf', documentType: 'Appraisal', status: 'ACCEPTED', uploadedAt: '2026-06-20T00:00:00Z', fromLoanTeam: true },
  { id: 'f2', fileName: 'loan_estimate.pdf', documentType: 'LE', status: 'ACCEPTED', uploadedAt: '2026-06-15T00:00:00Z', fromLoanTeam: true },
];

describe('DownloadsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mortgageService.getBorrowerDocumentDownloadUrl.mockResolvedValue({ downloadUrl: 'https://s3/x' });
  });

  test('renders a row per team-shared doc with a Download button', () => {
    render(<DownloadsCard fromTeam={FROM_TEAM} suiteLoanId="loan-1" />);
    expect(screen.getByText('appraisal_report.pdf')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /download/i }).length).toBe(2);
  });

  test('clicking Download calls the reused download-url service fn with the doc id', async () => {
    render(<DownloadsCard fromTeam={FROM_TEAM} suiteLoanId="loan-1" />);
    fireEvent.click(screen.getAllByRole('button', { name: /download/i })[0]);
    await waitFor(() =>
      expect(mortgageService.getBorrowerDocumentDownloadUrl).toHaveBeenCalledTimes(1));
    expect(mortgageService.getBorrowerDocumentDownloadUrl).toHaveBeenCalledWith('loan-1', 'f1');
  });

  test('empty state renders when the loan team has shared nothing', () => {
    render(<DownloadsCard fromTeam={[]} suiteLoanId="loan-1" />);
    expect(screen.getByText(/documents your loan team shares will appear here/i)).toBeInTheDocument();
  });
});
