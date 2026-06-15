import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterChips from './FilterChips';
import { DEFAULT_FILTERS } from './useFilterUrlState';

test('Clear all is hidden when no filters active', () => {
  render(<FilterChips filters={DEFAULT_FILTERS} resultCount={42} onChange={() => {}} onClear={() => {}} />);
  expect(screen.queryByRole('button', { name: /clear all/i })).toBeNull();
});

test('Clear all visible when any filter active', () => {
  render(
    <FilterChips
      filters={{ ...DEFAULT_FILTERS, statuses: ['UNDERWRITING'] }}
      resultCount={3}
      onChange={() => {}} onClear={() => {}}
    />
  );
  expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
});

test('toggling conditions-checkbox calls onChange with conditionsGt: 0', () => {
  const onChange = jest.fn();
  render(
    <FilterChips filters={DEFAULT_FILTERS} resultCount={0} onChange={onChange} onClear={() => {}} />
  );
  // Secondary filters (incl. the conditions checkbox) live behind the "More filters" toggle.
  fireEvent.click(screen.getByRole('button', { name: /more filters/i }));
  fireEvent.click(screen.getByLabelText(/has outstanding conditions/i));
  expect(onChange).toHaveBeenCalledWith({ conditionsGt: 0 });
});

test('Clear button calls onClear', () => {
  const onClear = jest.fn();
  render(
    <FilterChips
      filters={{ ...DEFAULT_FILTERS, statuses: ['UNDERWRITING'] }}
      resultCount={0}
      onChange={() => {}} onClear={onClear}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
  expect(onClear).toHaveBeenCalled();
});

test('result count rendered', () => {
  render(<FilterChips filters={DEFAULT_FILTERS} resultCount={42} onChange={() => {}} onClear={() => {}} />);
  expect(screen.getByText('42 results')).toBeInTheDocument();
});
