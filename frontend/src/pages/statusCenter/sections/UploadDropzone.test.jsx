import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UploadDropzone from './UploadDropzone';
import mortgageService from '../../../services/mortgageService';

jest.mock('../../../services/mortgageService', () => ({
  __esModule: true,
  default: { uploadBorrowerDocument: jest.fn() },
}));

describe('UploadDropzone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mortgageService.uploadBorrowerDocument.mockResolvedValue({ docUuid: 'd1' });
  });

  test('renders the forest dropzone with a browse control', () => {
    render(<UploadDropzone suiteLoanId="loan-1" onUploaded={jest.fn()} />);
    expect(screen.getByText(/drop your documents/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse/i })).toBeInTheDocument();
  });

  test('selecting a file runs the reused upload service against the loan, then fires onUploaded', async () => {
    const onUploaded = jest.fn();
    const { container } = render(<UploadDropzone suiteLoanId="loan-1" onUploaded={onUploaded} />);
    const file = new File(['bytes'], 'paystub.pdf', { type: 'application/pdf' });
    const input = container.querySelector('input[type="file"]');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(mortgageService.uploadBorrowerDocument).toHaveBeenCalledTimes(1));
    expect(mortgageService.uploadBorrowerDocument).toHaveBeenCalledWith('loan-1', file);
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
  });

  test('does not upload when there is no suiteLoanId', async () => {
    const { container } = render(<UploadDropzone suiteLoanId={null} onUploaded={jest.fn()} />);
    const file = new File(['bytes'], 'x.pdf', { type: 'application/pdf' });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
    await Promise.resolve();
    expect(mortgageService.uploadBorrowerDocument).not.toHaveBeenCalled();
  });
});
