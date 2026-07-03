import React from 'react';
import { render, screen } from '@testing-library/react';
import DocumentHistory from './DocumentHistory';

const UPLOADS = [
  { id: 'u1', fileName: 'chase_statement_may.jpg', documentType: 'Bank statements', status: 'UPLOADED', uploadedAt: '2026-07-02T00:00:00Z', fromLoanTeam: false },
  { id: 'u2', fileName: 'insurance_binder.pdf', documentType: 'HOI binder', status: 'READY_FOR_REVIEW', uploadedAt: '2026-06-30T00:00:00Z', fromLoanTeam: false },
  { id: 'u3', fileName: 'earnest_money_wire.pdf', documentType: 'EMD proof', status: 'ACCEPTED', uploadedAt: '2026-06-17T00:00:00Z', fromLoanTeam: false },
];

describe('DocumentHistory', () => {
  test('renders a PDF filetype chip from the file extension', () => {
    render(<DocumentHistory uploads={UPLOADS} />);
    expect(screen.getAllByText('PDF').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('JPG')).toBeInTheDocument();
  });

  test('maps upload/ready statuses to "In review" and accepted to "Cleared"', () => {
    render(<DocumentHistory uploads={UPLOADS} />);
    expect(screen.getAllByText('In review').length).toBe(2);
    expect(screen.getByText('Cleared')).toBeInTheDocument();
  });

  test('renders the file name and a UTC-safe uploaded date (no off-by-one)', () => {
    render(<DocumentHistory uploads={UPLOADS} />);
    expect(screen.getByText('chase_statement_may.jpg')).toBeInTheDocument();
    // 2026-07-02Z must render as Jul 2, never Jul 1
    expect(screen.getByText(/Jul 2/)).toBeInTheDocument();
    expect(screen.queryByText(/Jul 1/)).not.toBeInTheDocument();
  });

  test('empty state renders when there are no uploads', () => {
    render(<DocumentHistory uploads={[]} />);
    expect(screen.getByText(/no documents uploaded yet/i)).toBeInTheDocument();
  });
});
