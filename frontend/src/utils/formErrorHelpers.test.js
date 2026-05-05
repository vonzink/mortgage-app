/**
 * @jest-environment jsdom
 */
import {
  collectErrors,
  humanizeFieldPath,
  summarizeErrors,
  focusFirstInvalidField,
} from './formErrorHelpers';

describe('collectErrors', () => {
  test('flattens nested error tree to leaf entries', () => {
    const errors = {
      loanPurpose: { type: 'required', message: 'Loan purpose is required' },
      property: {
        addressLine: { type: 'required' },
      },
      borrowers: [
        { firstName: { type: 'required', message: 'Required' } },
      ],
    };
    const out = collectErrors(errors);
    expect(out).toEqual([
      { path: 'loanPurpose',          message: 'Loan purpose is required' },
      { path: 'property.addressLine', message: 'is required' },
      { path: 'borrowers.0.firstName', message: 'Required' },
    ]);
  });

  test('returns empty list for empty / nullish input', () => {
    expect(collectErrors(null)).toEqual([]);
    expect(collectErrors({})).toEqual([]);
  });
});

describe('humanizeFieldPath', () => {
  test('converts dotted/index paths into friendly labels', () => {
    expect(humanizeFieldPath('loanAmount')).toBe('Loan Amount');
    expect(humanizeFieldPath('property.addressLine')).toBe('Property — Address Line');
    expect(humanizeFieldPath('borrowers.0.firstName')).toBe('Borrower 1 — First Name');
    expect(humanizeFieldPath('borrowers.0.residences.2.city'))
      .toBe('Borrower 1 — Residence 3 — City');
  });

  test('preserves common acronyms', () => {
    expect(humanizeFieldPath('ssn')).toBe('SSN');
    expect(humanizeFieldPath('zipCode')).toBe('ZIP Code');
  });
});

describe('summarizeErrors', () => {
  test('returns null when there are no errors', () => {
    expect(summarizeErrors({})).toBeNull();
  });

  test('caps the head and notes overflow', () => {
    const errors = Object.fromEntries(
      Array.from({ length: 8 }, (_, i) => [`field${i}`, { type: 'required' }]),
    );
    const result = summarizeErrors(errors, 3);
    expect(result.count).toBe(8);
    expect(result.lines).toHaveLength(4);
    expect(result.lines[result.lines.length - 1]).toBe('…and 5 more');
  });
});

describe('focusFirstInvalidField', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('focuses + scrolls the first invalid field by name attribute', () => {
    document.body.innerHTML = `
      <input name="loanAmount" />
      <input name="property.addressLine" />
    `;
    const second = document.querySelector('[name="property.addressLine"]');
    second.scrollIntoView = jest.fn();
    const focusSpy = jest.spyOn(second, 'focus');
    jest.useFakeTimers();

    focusFirstInvalidField({ 'property.addressLine': { type: 'required' } });

    expect(second.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    jest.runAllTimers();
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    jest.useRealTimers();
  });

  test('falls back to id selector when no [name] match', () => {
    document.body.innerHTML = `<input id="dateOfBirth" />`;
    const el = document.getElementById('dateOfBirth');
    el.scrollIntoView = jest.fn();
    const focusSpy = jest.spyOn(el, 'focus');
    jest.useFakeTimers();

    focusFirstInvalidField({ dateOfBirth: { type: 'required' } });
    jest.runAllTimers();

    expect(focusSpy).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('no-ops when errors is empty or DOM has no match', () => {
    expect(() => focusFirstInvalidField({})).not.toThrow();
    expect(() => focusFirstInvalidField({ missing: { type: 'required' } })).not.toThrow();
  });
});
