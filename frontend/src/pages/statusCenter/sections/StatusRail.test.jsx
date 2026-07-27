import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusRail from './StatusRail';

// v2.1 wire contract: milestones = the 8 pipeline Kanban lanes in board order
// (INACTIVE is never a step). key = KanbanLane.name(), label = lane label().
const MILESTONES = [
  { key: 'PRE_APPROVAL', label: 'Pre-Approval', state: 'DONE', date: '2026-04-20' },
  { key: 'APPLICATION', label: 'Application', state: 'DONE', date: '2026-05-01' },
  { key: 'PROCESSING', label: 'Processing', state: 'DONE', date: '2026-05-20' },
  { key: 'UNDERWRITING', label: 'Underwriting', state: 'CURRENT', date: null },
  { key: 'CONDITIONAL_APPROVAL', label: 'Conditional Approval', state: 'UPCOMING', date: null },
  { key: 'CLEAR_TO_CLOSE', label: 'Clear to Close', state: 'UPCOMING', date: null },
  { key: 'CLOSED', label: 'Closed', state: 'UPCOMING', date: null },
  { key: 'FUNDED', label: 'Funded', state: 'UPCOMING', date: null },
];

test('renders all 8 lane milestones as list items, in payload order', () => {
  render(<StatusRail milestones={MILESTONES} />);
  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(8);
  expect(items.map((li) => li.querySelector('.lsc-rl-label').textContent)).toEqual([
    'Pre-Approval', 'Application', 'Processing', 'Underwriting',
    'Conditional Approval', 'Clear to Close', 'Closed', 'Funded',
  ]);
});

test('renders exactly as many entries as the payload sends (no hardcoded count)', () => {
  render(<StatusRail milestones={MILESTONES.slice(0, 3)} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
});

test('marks done and current nodes with state classes', () => {
  render(<StatusRail milestones={MILESTONES} />);
  expect(screen.getByText('Application').closest('li')).toHaveClass('done');
  expect(screen.getByText('Underwriting').closest('li')).toHaveClass('current');
});

test('done milestone shows its date; a null-date DONE shows "Completed"; no literal null', () => {
  const withNullDate = [
    { key: 'PRE_APPROVAL', label: 'Pre-Approval', state: 'DONE', date: null },
    ...MILESTONES.slice(1),
  ];
  render(<StatusRail milestones={withNullDate} />);
  // DONE with a history-derived date renders it (UTC-safe — no off-by-one)
  expect(screen.getByText(/May 1, 2026|May 01, 2026/)).toBeInTheDocument();
  // DONE with no lane-history date renders the "Completed" fallback, never "null"
  expect(screen.getByText('Completed')).toBeInTheDocument();
  expect(screen.queryByText('null')).not.toBeInTheDocument();
});

test('all-UPCOMING/no-CURRENT rail (INACTIVE effective lane) renders without a current node', () => {
  const inactive = MILESTONES.map((m) => ({ ...m, state: m.state === 'CURRENT' ? 'UPCOMING' : m.state }));
  const { container } = render(<StatusRail milestones={inactive} />);
  expect(container.querySelectorAll('.lsc-rl.current')).toHaveLength(0);
  expect(container.querySelectorAll('.lsc-rl.done')).toHaveLength(3);
});
