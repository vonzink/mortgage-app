/**
 * Unit tests for mortgageService.inviteCoBorrower — the co-borrower "Invite to apply"
 * send into the msfg-suite (system of record).
 *
 * Asserts the method POSTs the exact suite path + body and unwraps the { success, data }
 * envelope. The HTTP layer (suiteClient) is mocked.
 */
import mortgageService from './mortgageService';
import { suiteClient } from './apiClient';

vi.mock('./apiClient', () => ({
  __esModule: true,
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  suiteClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

afterEach(() => vi.clearAllMocks());

describe('mortgageService.inviteCoBorrower (suite /co-borrowers/invite)', () => {
  test('POSTs the suite invite path + body and unwraps the envelope', async () => {
    suiteClient.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          partyId: 'party-uuid-1',
          sent: true,
          link: 'https://app.msfgco.com/continue#invite=abc',
        },
      },
    });

    const result = await mortgageService.inviteCoBorrower(
      'loan-uuid-1',
      { ordinal: 1, email: 'co@example.com', firstName: 'Pat', lastName: 'Smith' },
    );

    expect(suiteClient.post).toHaveBeenCalledWith(
      '/loans/loan-uuid-1/co-borrowers/invite',
      { ordinal: 1, email: 'co@example.com', firstName: 'Pat', lastName: 'Smith' },
    );
    expect(result).toEqual({
      partyId: 'party-uuid-1',
      sent: true,
      link: 'https://app.msfgco.com/continue#invite=abc',
    });
  });

  test('tolerates a bare (un-enveloped) payload', async () => {
    suiteClient.post.mockResolvedValue({
      data: { partyId: 'p2', sent: true, link: 'x' },
    });
    const result = await mortgageService.inviteCoBorrower('loan-2', {
      ordinal: 2,
      email: 'c@e.com',
      firstName: 'Jo',
      lastName: 'Doe',
    });
    expect(result).toEqual({ partyId: 'p2', sent: true, link: 'x' });
  });

  test('propagates the suite error (caller surfaces the message)', async () => {
    const err = new Error('bad ordinal');
    err.response = { data: { message: 'Ordinal out of order' } };
    suiteClient.post.mockRejectedValue(err);

    await expect(
      mortgageService.inviteCoBorrower('loan-3', {
        ordinal: 5,
        email: 'c@e.com',
        firstName: 'Jo',
        lastName: 'Doe',
      }),
    ).rejects.toThrow('bad ordinal');
  });
});

describe('mortgageService.acceptCoBorrowerInvite (suite /co-borrowers/accept-invite)', () => {
  test('POSTs the accept path + token and unwraps the envelope', async () => {
    suiteClient.post.mockResolvedValue({
      data: { success: true, data: { loanId: 'loan-uuid-1', partyId: 'party-uuid-1' } },
    });

    const result = await mortgageService.acceptCoBorrowerInvite('loan-uuid-1', 'tok.sig');

    expect(suiteClient.post).toHaveBeenCalledWith(
      '/loans/loan-uuid-1/co-borrowers/accept-invite',
      { token: 'tok.sig' },
    );
    expect(result).toEqual({ loanId: 'loan-uuid-1', partyId: 'party-uuid-1' });
  });

  test('propagates the suite error (e.g. wrong email / already claimed)', async () => {
    const err = new Error('forbidden');
    err.response = { data: { message: 'Invite was sent to a different email address' } };
    suiteClient.post.mockRejectedValue(err);

    await expect(
      mortgageService.acceptCoBorrowerInvite('loan-3', 'tok'),
    ).rejects.toThrow('forbidden');
  });
});
