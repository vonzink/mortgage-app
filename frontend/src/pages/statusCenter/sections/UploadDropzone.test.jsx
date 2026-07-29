import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import UploadDropzone from './UploadDropzone';
import mortgageService from '../../../services/mortgageService';

jest.mock('../../../services/mortgageService', () => ({
  __esModule: true,
  default: { uploadBorrowerDocument: jest.fn() },
}));

jest.mock('react-toastify', () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn() },
}));

/** Builds a File whose reported size we control (real Files cap at the byte array). */
const fileOfSize = (name, type, size) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

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

  // A file that never reaches the suite must never look like a success: the client
  // is the only one who can retry, so every failure path has to be visible.
  test('a failed upload toasts the error and does not fire onUploaded', async () => {
    const onUploaded = jest.fn();
    mortgageService.uploadBorrowerDocument.mockRejectedValue(new Error('403'));
    const { container } = render(<UploadDropzone suiteLoanId="loan-1" onUploaded={onUploaded} />);
    const file = new File(['bytes'], 'paystub.pdf', { type: 'application/pdf' });

    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/paystub\.pdf/)));
    expect(onUploaded).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  test('a file over 25 MB is rejected client-side, never sent to the suite', async () => {
    const { container } = render(<UploadDropzone suiteLoanId="loan-1" onUploaded={jest.fn()} />);
    const big = fileOfSize('huge.pdf', 'application/pdf', 26 * 1024 * 1024);

    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [big] } });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/larger than 25 MB/)));
    expect(mortgageService.uploadBorrowerDocument).not.toHaveBeenCalled();
  });

  test('an unsupported file type is rejected client-side', async () => {
    const { container } = render(<UploadDropzone suiteLoanId="loan-1" onUploaded={jest.fn()} />);
    const doc = new File(['bytes'], 'notes.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [doc] } });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/not a PDF/)));
    expect(mortgageService.uploadBorrowerDocument).not.toHaveBeenCalled();
  });

  // HEIC straight off an iPhone frequently arrives with an empty MIME type.
  test('a HEIC with no MIME type is accepted on extension', async () => {
    const { container } = render(<UploadDropzone suiteLoanId="loan-1" onUploaded={jest.fn()} />);
    const heic = new File(['bytes'], 'IMG_0042.HEIC', { type: '' });

    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [heic] } });

    await waitFor(() => expect(mortgageService.uploadBorrowerDocument).toHaveBeenCalledTimes(1));
    expect(toast.error).not.toHaveBeenCalled();
  });

  test('a successful upload toasts success', async () => {
    const { container } = render(<UploadDropzone suiteLoanId="loan-1" onUploaded={jest.fn()} />);
    const file = new File(['bytes'], 'w2.pdf', { type: 'application/pdf' });

    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Uploaded 1 document'));
  });
});
