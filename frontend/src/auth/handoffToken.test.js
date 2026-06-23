import { decodeHandoffToken } from './handoffToken';

function makeToken(payloadObj) {
  const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256' })}.${b64({ h: payloadObj })}.sig`;
}

test('decodes the h claim from a token', () => {
  const t = makeToken({ sourceLeadId: 'lead-1', loanPurpose: 'Purchase',
    borrower: { firstName: 'Ann' }, property: {}, display: {}, loanOfficer: null });
  const p = decodeHandoffToken(t);
  expect(p.sourceLeadId).toBe('lead-1');
  expect(p.borrower.firstName).toBe('Ann');
});

test('returns null on a malformed token', () => {
  expect(decodeHandoffToken('garbage')).toBeNull();
  expect(decodeHandoffToken(null)).toBeNull();
});
