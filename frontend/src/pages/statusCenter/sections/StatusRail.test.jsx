import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusRail from './StatusRail';

const MILESTONES = [
  { key: 'application', label: 'Application', state: 'DONE', date: '2026-07-01' },
  { key: 'processing', label: 'Processing', state: 'CURRENT', date: null },
  { key: 'underwriting', label: 'Underwriting', state: 'UPCOMING', date: null },
  { key: 'conditional-approval', label: 'Conditional approval', state: 'UPCOMING', date: null },
  { key: 'clear-to-close', label: 'Clear to close', state: 'UPCOMING', date: null },
  { key: 'closing', label: 'Closing', state: 'UPCOMING', date: null },
];

test('renders all six milestones as list items', () => {
  render(<StatusRail milestones={MILESTONES} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(6);
});

test('marks done and current nodes with state classes', () => {
  render(<StatusRail milestones={MILESTONES} />);
  expect(screen.getByText('Application').closest('li')).toHaveClass('done');
  expect(screen.getByText('Processing').closest('li')).toHaveClass('current');
});

test('done milestone shows its date; current shows a status label not a null', () => {
  render(<StatusRail milestones={MILESTONES} />);
  // done node surfaces a formatted date (UTC-safe — no off-by-one)
  expect(screen.getByText(/Jul 1, 2026|Jul 01, 2026/)).toBeInTheDocument();
  // current node shows a human label, never the literal "null"
  expect(screen.queryByText('null')).not.toBeInTheDocument();
});
