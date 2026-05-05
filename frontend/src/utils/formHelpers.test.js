import {
  calculateResidenceHistoryDuration,
  calculateEmploymentHistoryDuration,
  checkResidenceHistoryWarning,
  checkEmploymentHistoryWarning,
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
  isValidEmail,
  isValidPhone,
  isValidSSN,
  formatSSN,
  formatPhone,
} from './formHelpers';

describe('residence history duration', () => {
  test('returns 0 for empty / non-array', () => {
    expect(calculateResidenceHistoryDuration(null)).toBe(0);
    expect(calculateResidenceHistoryDuration(undefined)).toBe(0);
    expect(calculateResidenceHistoryDuration([])).toBe(0);
  });

  test('sums numeric durationMonths', () => {
    expect(calculateResidenceHistoryDuration([
      { durationMonths: 12 },
      { durationMonths: 18 },
    ])).toBe(30);
  });

  test('coerces string durations and ignores garbage', () => {
    expect(calculateResidenceHistoryDuration([
      { durationMonths: '24' },
      { durationMonths: 'abc' },
      { durationMonths: 6 },
    ])).toBe(30);
  });
});

describe('employment history duration', () => {
  test('skips entries with no startDate', () => {
    expect(calculateEmploymentHistoryDuration([{ endDate: '2024-01-01' }])).toBe(0);
  });

  test('uses today when endDate is missing (current job)', () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const months = calculateEmploymentHistoryDuration([
      { startDate: oneYearAgo.toISOString().slice(0, 10) },
    ]);
    // Approx 12 months ± 1 (date math is calendar-fuzzy)
    expect(months).toBeGreaterThanOrEqual(11);
    expect(months).toBeLessThanOrEqual(13);
  });
});

describe('history warnings', () => {
  test('residence: hasWarning when below threshold and any duration data is present', () => {
    const result = checkResidenceHistoryWarning(
      [{ durationMonths: 6, durationYears: 0, durationMonthsOnly: 6 }],
      24,
    );
    expect(result.hasWarning).toBe(true);
    expect(result.totalDuration).toBe(6);
  });

  test('residence: no warning when no data entered', () => {
    const result = checkResidenceHistoryWarning([{ durationMonths: 0 }], 24);
    expect(result.hasWarning).toBe(false);
  });

  test('employment: warns when start date present but total < threshold', () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const result = checkEmploymentHistoryWarning(
      [{ startDate: lastMonth.toISOString().slice(0, 10) }],
      24,
    );
    expect(result.hasWarning).toBe(true);
  });
});

describe('currency formatting', () => {
  test('formatCurrency: $ prefix, two decimals, commas', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
    expect(formatCurrency('500000')).toBe('$500,000.00');
    expect(formatCurrency(null)).toBe('$0.00');
    expect(formatCurrency('not a number')).toBe('$0.00');
  });

  test('formatCurrencyInput: no $, two decimals, drops non-numeric', () => {
    expect(formatCurrencyInput('1234.5')).toBe('1,234.50');
    expect(formatCurrencyInput('$1,234.56abc')).toBe('1,234.56');
    expect(formatCurrencyInput('')).toBe('');
    expect(formatCurrencyInput('garbage')).toBe('');
  });

  test('parseCurrencyInput: returns number, handles commas, falls back to 0', () => {
    expect(parseCurrencyInput('1,234.50')).toBe(1234.5);
    expect(parseCurrencyInput('500,000')).toBe(500000);
    expect(parseCurrencyInput('')).toBe(0);
    expect(parseCurrencyInput('xyz')).toBe(0);
  });

  test('round-trip: format then parse preserves the value', () => {
    expect(parseCurrencyInput(formatCurrencyInput('123456.78'))).toBe(123456.78);
  });
});

describe('validators', () => {
  test('isValidEmail', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('foo+tag@bar.com')).toBe(true);
    expect(isValidEmail('no-at-sign')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  test('isValidPhone — accepts xxx-xxx-xxxx, (xxx) xxx-xxxx, dotted', () => {
    expect(isValidPhone('555-123-4567')).toBe(true);
    expect(isValidPhone('(555) 123-4567')).toBe(true);
    expect(isValidPhone('555.123.4567')).toBe(true);
    expect(isValidPhone('5551234567')).toBe(true);
    expect(isValidPhone('123')).toBe(false);
  });

  test('isValidSSN — accepts dashed and undashed 9-digit', () => {
    expect(isValidSSN('123-45-6789')).toBe(true);
    expect(isValidSSN('123456789')).toBe(true);
    expect(isValidSSN('12-345-6789')).toBe(false);
    expect(isValidSSN('123-45-678')).toBe(false);
  });
});

describe('input masks', () => {
  test('formatSSN — progressive shape xxx-xx-xxxx, drops non-digits, caps at 9', () => {
    expect(formatSSN('')).toBe('');
    expect(formatSSN('1')).toBe('1');
    expect(formatSSN('123')).toBe('123');
    expect(formatSSN('1234')).toBe('123-4');
    expect(formatSSN('12345')).toBe('123-45');
    expect(formatSSN('123456')).toBe('123-45-6');
    expect(formatSSN('123456789')).toBe('123-45-6789');
    expect(formatSSN('123-45-6789EXTRA')).toBe('123-45-6789');
    expect(formatSSN(null)).toBe('');
  });

  test('formatPhone — progressive shape xxx-xxx-xxxx, caps at 10', () => {
    expect(formatPhone('')).toBe('');
    expect(formatPhone('555')).toBe('555');
    expect(formatPhone('5551')).toBe('555-1');
    expect(formatPhone('5551234')).toBe('555-123-4');
    expect(formatPhone('5551234567')).toBe('555-123-4567');
    expect(formatPhone('(555) 123-4567 x9999')).toBe('555-123-4567');
    expect(formatPhone(null)).toBe('');
  });
});
