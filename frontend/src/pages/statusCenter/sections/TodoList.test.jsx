import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TodoList from './TodoList';

const CONDITIONS = {
  outstandingCount: 2,
  items: [
    { id: 'c1', status: 'Outstanding', conditionText: '2025 W-2 — all employers', dueDate: '2026-07-08' },
    { id: 'c2', status: 'In Review', conditionText: "Homeowner's insurance binder" },
    { id: 'c3', status: 'Cleared', conditionText: 'Purchase contract — fully executed' },
  ],
};

describe('TodoList', () => {
  test('outstanding row renders a Needed tag and an Upload button', () => {
    render(<TodoList conditions={CONDITIONS} onUploadForCondition={jest.fn()} />);
    expect(screen.getByText('2025 W-2 — all employers')).toBeInTheDocument();
    expect(screen.getByText('Needed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });

  test('in-review row renders without an Upload button', () => {
    render(<TodoList conditions={CONDITIONS} onUploadForCondition={jest.fn()} />);
    const row = screen.getByText("Homeowner's insurance binder").closest('.lsc-cond');
    expect(row).toBeInTheDocument();
    expect(row.textContent).toContain('In review');
    expect(row.querySelector('.lsc-up-btn')).toBeNull();
  });

  test('cleared items are not shown in the to-do list', () => {
    render(<TodoList conditions={CONDITIONS} onUploadForCondition={jest.fn()} />);
    expect(screen.queryByText('Purchase contract — fully executed')).not.toBeInTheDocument();
  });

  test('clicking Upload fires onUploadForCondition with that condition', () => {
    const onUpload = jest.fn();
    render(<TodoList conditions={CONDITIONS} onUploadForCondition={onUpload} />);
    fireEvent.click(screen.getByRole('button', { name: /upload/i }));
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload).toHaveBeenCalledWith(CONDITIONS.items[0]);
  });

  test('renders a header with the open count', () => {
    render(<TodoList conditions={CONDITIONS} onUploadForCondition={jest.fn()} />);
    expect(screen.getByText(/to-do list/i)).toBeInTheDocument();
    expect(screen.getByText(/open/i)).toBeInTheDocument();
  });
});
