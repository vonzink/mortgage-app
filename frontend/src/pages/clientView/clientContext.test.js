import { setClientContext, getClientContext, clearClientContext } from './clientContext';

describe('clientContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('round-trips the context set/get', () => {
    const ctx = { borrowerId: 'b-1', loanId: 'l-1', name: 'Jane Doe' };
    setClientContext(ctx);
    expect(getClientContext()).toEqual(ctx);
  });

  it('returns null when nothing is stored', () => {
    expect(getClientContext()).toBeNull();
  });

  it('returns null (never throws) on a corrupt stash', () => {
    sessionStorage.setItem('clientContext', '{not json');
    expect(() => getClientContext()).not.toThrow();
    expect(getClientContext()).toBeNull();
  });

  it('returns null when the stash has no borrowerId', () => {
    sessionStorage.setItem('clientContext', JSON.stringify({ loanId: 'l-1', name: 'Jane Doe' }));
    expect(getClientContext()).toBeNull();
  });

  it('clearClientContext removes the stash', () => {
    setClientContext({ borrowerId: 'b-1', loanId: 'l-1', name: 'Jane Doe' });
    clearClientContext();
    expect(getClientContext()).toBeNull();
  });
});
