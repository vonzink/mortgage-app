import { redirectStaffToConsole } from './consoleHandoff';
import { SSO_COOKIE } from './sharedSession';

const staffUser = { expired: false, refresh_token: 'rt-1', profile: { 'cognito:groups': ['LO'] } };

let replaceMock;
const origEnv = { ...process.env };

beforeEach(() => {
  replaceMock = jest.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { replace: replaceMock, hostname: 'localhost', protocol: 'http:' },
  });
});

afterEach(() => {
  process.env.REACT_APP_SUITE_WEB_URL = origEnv.REACT_APP_SUITE_WEB_URL || '';
  process.env.REACT_APP_COGNITO_CLIENT_ID = origEnv.REACT_APP_COGNITO_CLIENT_ID || '';
  document.cookie = `${SSO_COOKIE}=; Path=/; Max-Age=0`;
});

test('no console origin configured → does not redirect, returns false', () => {
  process.env.REACT_APP_SUITE_WEB_URL = '';
  expect(redirectStaffToConsole(staffUser)).toBe(false);
  expect(replaceMock).not.toHaveBeenCalled();
});

test('console origin set → redirects to the console root, returns true', () => {
  process.env.REACT_APP_SUITE_WEB_URL = 'https://suite.msfgco.com';
  expect(redirectStaffToConsole(staffUser)).toBe(true);
  expect(replaceMock).toHaveBeenCalledWith('https://suite.msfgco.com');
});

test('trailing slash on the origin is normalized away', () => {
  process.env.REACT_APP_SUITE_WEB_URL = 'https://suite.msfgco.com/';
  redirectStaffToConsole(staffUser);
  expect(replaceMock).toHaveBeenCalledWith('https://suite.msfgco.com');
});

test('writes the SSO pointer cookie before leaving the origin (staff + client id)', () => {
  process.env.REACT_APP_SUITE_WEB_URL = 'https://suite.msfgco.com';
  process.env.REACT_APP_COGNITO_CLIENT_ID = 'test-client';
  redirectStaffToConsole(staffUser);
  expect(document.cookie).toContain(`${SSO_COOKIE}=`);
});
