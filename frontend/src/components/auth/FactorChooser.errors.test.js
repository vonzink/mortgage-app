import { codeErrorMessage, sendCodeErrorMessage } from './FactorChooser';

// Cognito (RespondToAuthChallenge, managed EMAIL_OTP) surfaces distinct exception
// `name`s that were previously collapsed into one misleading "didn't match". These
// pin the mapping so each failure keeps its own actionable next step.
describe('codeErrorMessage (verify)', () => {
  const err = (name, message = '') => ({ name, message });

  it('wrong code → "doesn’t match"', () => {
    expect(codeErrorMessage(err('CodeMismatchException'))).toMatch(/doesn.t match/i);
  });

  it('expired code → says expired + resend', () => {
    expect(codeErrorMessage(err('ExpiredCodeException'))).toMatch(/expired/i);
    expect(codeErrorMessage(err('ExpiredCodeException'))).toMatch(/resend/i);
  });

  it('dead/expired session (NotAuthorized) → expired/used + resend, NOT "wrong digits"', () => {
    const m = codeErrorMessage(err('NotAuthorizedException', 'Invalid session for the user, session is expired.'));
    expect(m).toMatch(/expired/i);
    expect(m).not.toMatch(/doesn.t match/i);
  });

  it('rate limited → wait + resend', () => {
    expect(codeErrorMessage(err('LimitExceededException'))).toMatch(/too many/i);
    expect(codeErrorMessage(err('TooManyRequestsException'))).toMatch(/too many/i);
  });

  it('too many wrong tries → resend to start over', () => {
    expect(codeErrorMessage(err('TooManyFailedAttemptsException'))).toMatch(/too many|resend/i);
  });

  it('unknown error → safe fallback pointing at resend', () => {
    expect(codeErrorMessage(err('SomethingWeird'))).toMatch(/resend/i);
    expect(codeErrorMessage(null)).toMatch(/resend/i);
  });
});

describe('sendCodeErrorMessage (resend)', () => {
  it('rate limit (daily cap) → explicit "too many codes"', () => {
    expect(sendCodeErrorMessage({ name: 'LimitExceededException' })).toMatch(/too many codes/i);
    expect(sendCodeErrorMessage({ name: 'TooManyRequestsException' })).toMatch(/too many codes/i);
  });

  it('generic send failure → try again', () => {
    expect(sendCodeErrorMessage({ name: 'InternalErrorException' })).toMatch(/try again/i);
  });
});
