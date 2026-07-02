import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { toast } from 'react-toastify';
import BorrowerDocuments from './BorrowerDocuments';
import mortgageService from '../../services/mortgageService';

jest.mock('../../services/mortgageService', () => ({
  __esModule: true,
  default: {
    getBorrowerDocuments: jest.fn(),
    getBorrowerDocumentDownloadUrl: jest.fn(),
    uploadBorrowerDocument: jest.fn(),
  },
}));

jest.mock('react-toastify', () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

const ORIGINAL_LOCATION = window.location;

const OWN_DOC = {
  docUuid: 'own-1',
  fileName: 'paystub-may.pdf',
  fileSize: 45000,
  status: 'UPLOADED',
  uploadedAt: '2026-05-01T10:00:00Z',
  fromLoanTeam: false,
};

const SHARED_DOC = {
  docUuid: 'shared-1',
  fileName: 'loan-estimate.pdf',
  fileSize: 88000,
  status: 'ACCEPTED',
  uploadedAt: '2026-05-02T10:00:00Z',
  fromLoanTeam: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  delete window.location;
  window.location = { ...ORIGINAL_LOCATION, href: '' };
});

afterEach(() => {
  window.location = ORIGINAL_LOCATION;
});

test('renders both "Your uploads" and "From your loan team" sections when the list mixes own and shared docs', async () => {
  mortgageService.getBorrowerDocuments.mockResolvedValue([OWN_DOC, SHARED_DOC]);

  render(<BorrowerDocuments suiteLoanId="loan-1" />);

  await waitFor(() => expect(mortgageService.getBorrowerDocuments).toHaveBeenCalledWith('loan-1'));

  expect(await screen.findByText(/your uploads/i)).toBeInTheDocument();
  expect(screen.getByText(/from your loan team/i)).toBeInTheDocument();
  expect(screen.getByText('paystub-may.pdf')).toBeInTheDocument();
  expect(screen.getByText('loan-estimate.pdf')).toBeInTheDocument();
});

test('shared row renders fileName and a Download control with no other interactive controls', async () => {
  mortgageService.getBorrowerDocuments.mockResolvedValue([OWN_DOC, SHARED_DOC]);

  render(<BorrowerDocuments suiteLoanId="loan-1" />);

  const heading = await screen.findByText(/from your loan team/i);
  const section = heading.closest('[data-testid="borrower-docs__team-section"]');
  expect(section).toBeInTheDocument();

  const sharedRow = within(section).getByText('loan-estimate.pdf').closest('[data-testid="borrower-doc-row"]');
  expect(sharedRow).toBeInTheDocument();

  const buttons = within(sharedRow).getAllByRole('button');
  expect(buttons).toHaveLength(1);
  expect(buttons[0]).toHaveAccessibleName(/download/i);
});

test('empty shared set does not render the "From your loan team" heading', async () => {
  mortgageService.getBorrowerDocuments.mockResolvedValue([OWN_DOC]);

  render(<BorrowerDocuments suiteLoanId="loan-1" />);

  await waitFor(() => expect(mortgageService.getBorrowerDocuments).toHaveBeenCalled());
  expect(await screen.findByText('paystub-may.pdf')).toBeInTheDocument();
  expect(screen.queryByText(/from your loan team/i)).not.toBeInTheDocument();
});

test('all-shared/no-own list shows the own-section empty state while the team section lists docs', async () => {
  mortgageService.getBorrowerDocuments.mockResolvedValue([SHARED_DOC]);

  render(<BorrowerDocuments suiteLoanId="loan-1" />);

  await waitFor(() => expect(mortgageService.getBorrowerDocuments).toHaveBeenCalled());
  expect(await screen.findByText(/no documents yet/i)).toBeInTheDocument();
  expect(screen.getByText(/from your loan team/i)).toBeInTheDocument();
  expect(screen.getByText('loan-estimate.pdf')).toBeInTheDocument();
});

test('download on a shared row calls getBorrowerDocumentDownloadUrl with the shared doc id', async () => {
  mortgageService.getBorrowerDocuments.mockResolvedValue([OWN_DOC, SHARED_DOC]);
  mortgageService.getBorrowerDocumentDownloadUrl.mockResolvedValue({
    downloadUrl: 'https://s3.example.com/shared-1', expiresInSeconds: 900,
  });

  render(<BorrowerDocuments suiteLoanId="loan-1" />);

  const heading = await screen.findByText(/from your loan team/i);
  const section = heading.closest('[data-testid="borrower-docs__team-section"]');
  const sharedRow = within(section).getByText('loan-estimate.pdf').closest('[data-testid="borrower-doc-row"]');
  within(sharedRow).getByRole('button', { name: /download/i }).click();

  await waitFor(() => expect(mortgageService.getBorrowerDocumentDownloadUrl).toHaveBeenCalledWith('loan-1', 'shared-1'));
  await waitFor(() => expect(window.location.href).toBe('https://s3.example.com/shared-1'));
});

test('the upload affordance is only present once and stays scoped to the own-uploads section', async () => {
  mortgageService.getBorrowerDocuments.mockResolvedValue([OWN_DOC, SHARED_DOC]);

  render(<BorrowerDocuments suiteLoanId="loan-1" />);
  await waitFor(() => expect(mortgageService.getBorrowerDocuments).toHaveBeenCalled());

  const uploadButtons = screen.getAllByRole('button', { name: /^upload/i });
  expect(uploadButtons).toHaveLength(1);

  const heading = await screen.findByText(/from your loan team/i);
  const section = heading.closest('[data-testid="borrower-docs__team-section"]');
  expect(within(section).queryByRole('button', { name: /^upload/i })).not.toBeInTheDocument();
});
