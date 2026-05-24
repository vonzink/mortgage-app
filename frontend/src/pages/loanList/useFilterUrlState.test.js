import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useFilterUrlState, DEFAULT_FILTERS } from './useFilterUrlState';

function wrap({ children, initialEntries }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="*" element={children} />
      </Routes>
    </MemoryRouter>
  );
}

function renderWithUrl(url) {
  return renderHook(() => useFilterUrlState(), {
    wrapper: ({ children }) => wrap({ children, initialEntries: [url] }),
  });
}

describe('useFilterUrlState', () => {
  test('returns defaults when URL has no params', () => {
    const { result } = renderWithUrl('/applications');
    expect(result.current.filters).toMatchObject(DEFAULT_FILTERS);
    expect(result.current.page).toBe(0);
    expect(result.current.size).toBe(25);
    expect(result.current.sort).toEqual({ field: 'createdDate', dir: 'desc' });
  });

  test('parses comma-separated status', () => {
    const { result } = renderWithUrl('/applications?status=UNDERWRITING,CTC');
    expect(result.current.filters.statuses).toEqual(['UNDERWRITING', 'CTC']);
  });

  test('parses numeric filters', () => {
    const { result } = renderWithUrl('/applications?conditionsGt=2&amountMin=300000&amountMax=900000');
    expect(result.current.filters.conditionsGt).toBe(2);
    expect(result.current.filters.amountMin).toBe(300000);
    expect(result.current.filters.amountMax).toBe(900000);
  });

  test('parses sort=field,dir', () => {
    const { result } = renderWithUrl('/applications?sort=statusChangedAt,asc');
    expect(result.current.sort).toEqual({ field: 'statusChangedAt', dir: 'asc' });
  });

  test('setFilters merges into URL', () => {
    const { result } = renderWithUrl('/applications');
    act(() => result.current.setFilters({ statuses: ['CTC'] }));
    expect(result.current.filters.statuses).toEqual(['CTC']);
  });

  test('setPage updates page param and resets to that page', () => {
    const { result } = renderWithUrl('/applications');
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
  });

  test('setSort changes sort, resets page to 0', () => {
    const { result } = renderWithUrl('/applications?page=4');
    act(() => result.current.setSort('loanAmount', 'asc'));
    expect(result.current.sort).toEqual({ field: 'loanAmount', dir: 'asc' });
    expect(result.current.page).toBe(0);
  });

  test('clearAll resets to defaults and page 0', () => {
    const { result } = renderWithUrl('/applications?status=UNDERWRITING&conditionsGt=2&page=3');
    act(() => result.current.clearAll());
    expect(result.current.filters).toMatchObject(DEFAULT_FILTERS);
    expect(result.current.page).toBe(0);
  });

  test('toQueryString builds a backend-friendly query string', () => {
    const { result } = renderWithUrl('/applications?status=UNDERWRITING&conditionsGt=1&sort=stageAge,desc&page=2');
    const qs = result.current.toQueryString();
    expect(qs).toContain('status=UNDERWRITING');
    expect(qs).toContain('conditionsGt=1');
    expect(qs).toContain('page=2');
    expect(qs).toContain('size=25');
  });
});
