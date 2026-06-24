/**
 * Unit tests for the real CognitoOtpAdapter state machine. The AWS SDK, cognitoSession,
 * and webauthn helpers are mocked so we exercise the adapter's orchestration + wire
 * shape without touching the network or a live pool.
 */
import { Factor } from './factors';

// ── Mocks ────────────────────────────────────────────────────────────────────
// Command constructors that just capture their input so we can assert the wire shape.
jest.mock('@aws-sdk/client-cognito-identity-provider', () => {
  const mk = (name) =>
    function Cmd(input) {
      return { __cmd: name, input };
    };
  return {
    CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
    InitiateAuthCommand: mk('InitiateAuth'),
    RespondToAuthChallengeCommand: mk('RespondToAuthChallenge'),
    StartWebAuthnRegistrationCommand: mk('StartWebAuthnRegistration'),
    CompleteWebAuthnRegistrationCommand: mk('CompleteWebAuthnRegistration'),
    ListWebAuthnCredentialsCommand: mk('ListWebAuthnCredentials'),
    DeleteWebAuthnCredentialCommand: mk('DeleteWebAuthnCredential'),
  };
});

jest.mock('./cognitoSession', () => ({ mintSession: jest.fn() }));

jest.mock('../webauthn', () => ({
  isWebAuthnSupported: jest.fn(),
  createPasskey: jest.fn(),
  getPasskeyAssertion: jest.fn(),
}));

const { mintSession } = require('./cognitoSession');
const webauthn = require('../webauthn');
const { CognitoOtpAdapter } = require('./CognitoOtpAdapter');

beforeEach(() => {
  // mintSession returns the oidc User directly; the adapter wraps it as { user }.
  mintSession.mockReset();
  mintSession.mockImplementation(async (authResult) => ({ id_token: authResult.IdToken }));
  webauthn.isWebAuthnSupported.mockReset();
  webauthn.isWebAuthnSupported.mockReturnValue(true);
  webauthn.createPasskey.mockReset();
  webauthn.createPasskey.mockResolvedValue({ attestation: 'att' });
  webauthn.getPasskeyAssertion.mockReset();
  webauthn.getPasskeyAssertion.mockResolvedValue({ assertion: 'asrt' });
});

function fakeClient(sendImpl) {
  return { send: jest.fn(sendImpl) };
}

describe('CognitoOtpAdapter.availableFactors (spec §3.3 — SMS hidden)', () => {
  test('offers passkey + email, never SMS', () => {
    const factors = CognitoOtpAdapter.availableFactors();
    expect(factors).toContain(Factor.EMAIL_OTP);
    expect(factors).toContain(Factor.PASSKEY);
    expect(factors).not.toContain(Factor.SMS_OTP);
  });

  test('omits passkey when WebAuthn unsupported', () => {
    webauthn.isWebAuthnSupported.mockReturnValue(false);
    const factors = CognitoOtpAdapter.availableFactors();
    expect(factors).not.toContain(Factor.PASSKEY);
    expect(factors).toContain(Factor.EMAIL_OTP);
  });
});

describe('CognitoOtpAdapter EMAIL_OTP state machine (confirmed wire shape)', () => {
  test('start issues InitiateAuth(USER_AUTH, PREFERRED_CHALLENGE=EMAIL_OTP)', async () => {
    const client = fakeClient(async () => ({
      Session: 'sess-1',
      ChallengeName: 'EMAIL_OTP',
      ChallengeParameters: { CODE_DELIVERY_DESTINATION: 'a***@e***.com' },
    }));
    CognitoOtpAdapter.__setClientForTest(client);

    const state = await CognitoOtpAdapter.start('ann@example.com', Factor.EMAIL_OTP);

    const sent = client.send.mock.calls[0][0];
    expect(sent.__cmd).toBe('InitiateAuth');
    expect(sent.input.AuthFlow).toBe('USER_AUTH');
    expect(sent.input.AuthParameters.USERNAME).toBe('ann@example.com');
    expect(sent.input.AuthParameters.PREFERRED_CHALLENGE).toBe('EMAIL_OTP');
    expect(state).toMatchObject({ kind: 'otp', factor: 'EMAIL_OTP', session: 'sess-1' });
    expect(state.destination).toBe('a***@e***.com');
  });

  test('respond sends EMAIL_OTP_CODE + USERNAME and mints the session', async () => {
    const client = fakeClient(async () => ({
      AuthenticationResult: { IdToken: 'idtok', AccessToken: 'acc', RefreshToken: 'ref' },
    }));
    CognitoOtpAdapter.__setClientForTest(client);

    const state = { kind: 'otp', factor: Factor.EMAIL_OTP, username: 'ann@example.com', session: 'sess-1', challengeName: 'EMAIL_OTP' };
    const res = await CognitoOtpAdapter.respond(state, { code: '123456' });

    const sent = client.send.mock.calls[0][0];
    expect(sent.__cmd).toBe('RespondToAuthChallenge');
    expect(sent.input.ChallengeName).toBe('EMAIL_OTP');
    expect(sent.input.Session).toBe('sess-1');
    expect(sent.input.ChallengeResponses.USERNAME).toBe('ann@example.com');
    expect(sent.input.ChallengeResponses.EMAIL_OTP_CODE).toBe('123456');
    expect(mintSession).toHaveBeenCalledWith({ IdToken: 'idtok', AccessToken: 'acc', RefreshToken: 'ref' });
    expect(res.user.id_token).toBe('idtok');
  });

  test('respond without a code rejects (no silent pass)', async () => {
    CognitoOtpAdapter.__setClientForTest(fakeClient(async () => ({})));
    const state = { kind: 'otp', factor: Factor.EMAIL_OTP, username: 'ann@example.com', session: 's' };
    await expect(CognitoOtpAdapter.respond(state, {})).rejects.toThrow(/code/);
  });

  test('respond surfaces a follow-on challenge instead of minting', async () => {
    const client = fakeClient(async () => ({ ChallengeName: 'NEW_PASSWORD_REQUIRED', Session: 's2' }));
    CognitoOtpAdapter.__setClientForTest(client);
    const state = { kind: 'otp', factor: Factor.EMAIL_OTP, username: 'a', session: 's' };
    await expect(CognitoOtpAdapter.respond(state, { code: '111111' })).rejects.toThrow(/additional challenge/);
  });
});

describe('CognitoOtpAdapter SMS gate', () => {
  test('start(SMS_OTP) rejects while SMS is disabled', async () => {
    CognitoOtpAdapter.__setClientForTest(fakeClient(async () => ({})));
    await expect(CognitoOtpAdapter.start('a@b.com', Factor.SMS_OTP)).rejects.toThrow(/not enabled/);
  });
});

describe('CognitoOtpAdapter WEB_AUTHN sign-in', () => {
  test('start runs the assertion ceremony and returns a passkey state', async () => {
    const client = fakeClient(async () => ({
      Session: 'wa-sess',
      ChallengeName: 'WEB_AUTHN',
      ChallengeParameters: { CREDENTIAL_REQUEST_OPTIONS: JSON.stringify({ challenge: 'x' }) },
    }));
    CognitoOtpAdapter.__setClientForTest(client);

    const state = await CognitoOtpAdapter.start('ann@example.com', Factor.PASSKEY);
    expect(webauthn.getPasskeyAssertion).toHaveBeenCalledWith({ challenge: 'x' });
    expect(state).toMatchObject({ kind: 'passkey', session: 'wa-sess' });
    expect(state.assertion).toEqual({ assertion: 'asrt' });
  });

  test('respond serializes the assertion under CREDENTIAL and mints', async () => {
    const client = fakeClient(async () => ({ AuthenticationResult: { IdToken: 'idtok' } }));
    CognitoOtpAdapter.__setClientForTest(client);
    const state = { kind: 'passkey', username: 'a@b.com', session: 'wa-sess', assertion: { assertion: 'asrt' } };
    await CognitoOtpAdapter.respond(state, {});
    const sent = client.send.mock.calls[0][0];
    expect(sent.input.ChallengeName).toBe('WEB_AUTHN');
    expect(typeof sent.input.ChallengeResponses.CREDENTIAL).toBe('string');
    expect(JSON.parse(sent.input.ChallengeResponses.CREDENTIAL)).toEqual({ assertion: 'asrt' });
  });
});

describe('CognitoOtpAdapter passkey management', () => {
  test('registerPasskey runs Start → ceremony → Complete', async () => {
    const client = fakeClient(async (cmd) => {
      if (cmd.__cmd === 'StartWebAuthnRegistration') {
        return { CredentialCreationOptions: JSON.stringify({ rp: { id: 'msfgco.com' } }) };
      }
      return {};
    });
    CognitoOtpAdapter.__setClientForTest(client);

    const res = await CognitoOtpAdapter.registerPasskey('acc-tok');
    expect(webauthn.createPasskey).toHaveBeenCalledWith({ rp: { id: 'msfgco.com' } });
    const cmds = client.send.mock.calls.map((c) => c[0].__cmd);
    expect(cmds).toEqual(['StartWebAuthnRegistration', 'CompleteWebAuthnRegistration']);
    expect(res).toEqual({ ok: true });
  });

  test('listPasskeys returns the Credentials array', async () => {
    CognitoOtpAdapter.__setClientForTest(
      fakeClient(async () => ({ Credentials: [{ CredentialId: 'c1' }] }))
    );
    await expect(CognitoOtpAdapter.listPasskeys('acc-tok')).resolves.toEqual([{ CredentialId: 'c1' }]);
  });

  test('deletePasskey requires a credentialId', async () => {
    CognitoOtpAdapter.__setClientForTest(fakeClient(async () => ({})));
    await expect(CognitoOtpAdapter.deletePasskey('acc-tok')).rejects.toThrow(/credentialId/);
  });

  test('access-token guards', async () => {
    CognitoOtpAdapter.__setClientForTest(fakeClient(async () => ({})));
    await expect(CognitoOtpAdapter.registerPasskey()).rejects.toThrow(/access token/);
    await expect(CognitoOtpAdapter.listPasskeys()).rejects.toThrow(/access token/);
  });
});
