import React from 'react';
import { render, screen } from '@testing-library/react';
import ClearedItems from './ClearedItems';

const CONDITIONS = {
  items: [
    { id: 'c1', status: 'Outstanding', conditionText: '2025 W-2 — all employers' },
    { id: 'c2', status: 'Cleared', conditionText: 'Purchase contract — fully executed', clearedDate: '2026-06-05' },
    { id: 'c3', status: 'Cleared', conditionText: "Driver's license — both borrowers" },
  ],
};

describe('ClearedItems', () => {
  test('renders cleared conditions only, with a check glyph and a count', () => {
    render(<ClearedItems conditions={CONDITIONS} />);
    expect(screen.getByText('Purchase contract — fully executed')).toBeInTheDocument();
    expect(screen.getByText("Driver's license — both borrowers")).toBeInTheDocument();
    expect(screen.queryByText('2025 W-2 — all employers')).not.toBeInTheDocument();
    expect(screen.getByText(/2 done/i)).toBeInTheDocument();
  });

  test('empty state renders when nothing is cleared', () => {
    render(<ClearedItems conditions={{ items: [{ id: 'x', status: 'Outstanding', conditionText: 'W-2' }] }} />);
    expect(screen.getByText(/nothing cleared yet/i)).toBeInTheDocument();
  });

  test('tolerates a missing conditions prop', () => {
    render(<ClearedItems conditions={null} />);
    expect(screen.getByText(/nothing cleared yet/i)).toBeInTheDocument();
  });
});
