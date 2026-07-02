import { suiteWebUrl, suiteLoanUrl } from './suiteWeb';

const ORIG = process.env.REACT_APP_SUITE_WEB_URL;
afterEach(() => { process.env.REACT_APP_SUITE_WEB_URL = ORIG; });

test('suiteLoanUrl builds the console loan URL', () => {
  process.env.REACT_APP_SUITE_WEB_URL = 'https://suite.msfgco.com';
  expect(suiteLoanUrl('abc-123')).toBe('https://suite.msfgco.com/loans/abc-123');
});

test('trailing slash tolerated', () => {
  process.env.REACT_APP_SUITE_WEB_URL = 'https://suite.msfgco.com/';
  expect(suiteLoanUrl('abc')).toBe('https://suite.msfgco.com/loans/abc');
});

test('unset → null (feature off)', () => {
  delete process.env.REACT_APP_SUITE_WEB_URL;
  expect(suiteWebUrl()).toBe('');
  expect(suiteLoanUrl('abc')).toBeNull();
});
