/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useDraftAutosave, clearDraft } from './useDraftAutosave';

/**
 * Minimal stand-in for react-hook-form's API surface that the hook actually touches:
 * watch(cb) returns an unsubscribe-bearing object and fires `cb` on every value change;
 * getValues returns the current state; reset replaces it.
 */
function makeFormStub(initial = {}) {
  let values = { ...initial };
  const subs = new Set();
  return {
    api: {
      getValues: () => values,
      reset: (next) => { values = { ...next }; },
      watch: (cb) => {
        subs.add(cb);
        return { unsubscribe: () => subs.delete(cb) };
      },
    },
    setField: (key, val) => {
      values = { ...values, [key]: val };
      subs.forEach((cb) => cb(values));
    },
    snapshot: () => values,
  };
}

beforeEach(() => {
  sessionStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useDraftAutosave', () => {
  test('restores from sessionStorage on mount when a draft exists', () => {
    sessionStorage.setItem('draft:test', JSON.stringify({ name: 'restored' }));
    const stub = makeFormStub({ name: 'initial' });

    renderHook(() =>
      useDraftAutosave({ ...stub.api, storageKey: 'draft:test' }),
    );

    expect(stub.snapshot()).toEqual({ name: 'restored' });
  });

  test('does nothing on mount when no draft is stored', () => {
    const stub = makeFormStub({ name: 'initial' });
    renderHook(() =>
      useDraftAutosave({ ...stub.api, storageKey: 'draft:empty' }),
    );
    expect(stub.snapshot()).toEqual({ name: 'initial' });
  });

  test('skips entirely when enabled=false', () => {
    sessionStorage.setItem('draft:disabled', JSON.stringify({ name: 'restored' }));
    const stub = makeFormStub({ name: 'initial' });
    renderHook(() =>
      useDraftAutosave({ ...stub.api, storageKey: 'draft:disabled', enabled: false }),
    );
    expect(stub.snapshot()).toEqual({ name: 'initial' });
  });

  test('debounces and writes the latest values to sessionStorage on change', () => {
    const stub = makeFormStub({ name: 'a' });
    renderHook(() =>
      useDraftAutosave({ ...stub.api, storageKey: 'draft:save', debounceMs: 100 }),
    );

    act(() => stub.setField('name', 'b'));
    act(() => stub.setField('name', 'c'));

    // Before debounce fires — nothing persisted
    expect(sessionStorage.getItem('draft:save')).toBeNull();

    act(() => { jest.advanceTimersByTime(100); });

    // Latest value wins
    expect(JSON.parse(sessionStorage.getItem('draft:save'))).toEqual({ name: 'c' });
  });

  test('discards corrupt JSON without throwing, and removes the bad entry', () => {
    sessionStorage.setItem('draft:bad', '{not valid json');
    const stub = makeFormStub({ name: 'initial' });

    renderHook(() =>
      useDraftAutosave({ ...stub.api, storageKey: 'draft:bad' }),
    );

    expect(stub.snapshot()).toEqual({ name: 'initial' });
    expect(sessionStorage.getItem('draft:bad')).toBeNull();
  });
});

describe('clearDraft', () => {
  test('removes the storage entry', () => {
    sessionStorage.setItem('draft:k', '{"x":1}');
    clearDraft('draft:k');
    expect(sessionStorage.getItem('draft:k')).toBeNull();
  });

  test('swallows errors silently', () => {
    expect(() => clearDraft('nonexistent')).not.toThrow();
  });
});
