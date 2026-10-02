import {
  BORROWER_LIST_VERSION_HEADER,
  listVersionKey,
  readStoredListVersion,
  storeListVersion,
  listVersionRequestConfig,
  listVersionFromResponse,
  isBorrowerListChanged,
} from './borrowerListVersion';
import { clearDraft } from '../hooks/useDraftAutosave';

beforeEach(() => sessionStorage.clear());

describe('stored list version', () => {
  it('lives next to the draft under the same key family', () => {
    expect(listVersionKey('draft:staff:L9')).toBe('draft:staff:L9:listVersion');
  });

  it('round-trips a version for its loan', () => {
    storeListVersion('draft:new', 'SL1', 'v1');
    expect(readStoredListVersion('draft:new', 'SL1')).toBe('v1');
  });

  it('is ignored for a different loan', () => {
    storeListVersion('draft:new', 'SL1', 'v1');
    expect(readStoredListVersion('draft:new', 'SL2')).toBeNull();
  });

  it('storing null removes it', () => {
    storeListVersion('draft:new', 'SL1', 'v1');
    storeListVersion('draft:new', 'SL1', null);
    expect(sessionStorage.getItem('draft:new:listVersion')).toBeNull();
  });

  it('a corrupt stored value reads as unknown', () => {
    sessionStorage.setItem('draft:new:listVersion', '{not json');
    expect(readStoredListVersion('draft:new', 'SL1')).toBeNull();
  });

  it('is cleared whenever the draft is cleared', () => {
    sessionStorage.setItem('draft:new', '{}');
    storeListVersion('draft:new', 'SL1', 'v1');
    clearDraft('draft:new');
    expect(sessionStorage.getItem('draft:new')).toBeNull();
    expect(sessionStorage.getItem('draft:new:listVersion')).toBeNull();
  });
});

describe('listVersionRequestConfig', () => {
  it('sends the header when a version is known', () => {
    expect(listVersionRequestConfig('v1')).toEqual({ headers: { [BORROWER_LIST_VERSION_HEADER]: 'v1' } });
    expect(BORROWER_LIST_VERSION_HEADER).toBe('X-Borrower-List-Version');
  });

  it('omits the header when none is known', () => {
    expect(listVersionRequestConfig(null)).toBeUndefined();
    expect(listVersionRequestConfig('')).toBeUndefined();
  });
});

describe('listVersionFromResponse', () => {
  it('reads the version from an ApiResponse envelope', () => {
    expect(listVersionFromResponse({ success: true, data: { borrowerListVersion: 'v2' } })).toBe('v2');
  });

  it('tolerates a bare payload and a missing version', () => {
    expect(listVersionFromResponse({ borrowerListVersion: 'v3' })).toBe('v3');
    expect(listVersionFromResponse({ success: true, data: {} })).toBeNull();
    expect(listVersionFromResponse(undefined)).toBeNull();
  });
});

describe('isBorrowerListChanged', () => {
  it('matches a 409 with code BORROWER_LIST_CHANGED', () => {
    expect(isBorrowerListChanged({
      response: { status: 409, data: { success: false, code: 'BORROWER_LIST_CHANGED', message: 'x' } },
    })).toBe(true);
  });

  it('does not match other conflicts or errors', () => {
    expect(isBorrowerListChanged({ response: { status: 409, data: { code: 'CONFLICT' } } })).toBe(false);
    expect(isBorrowerListChanged({ response: { status: 400, data: { code: 'BORROWER_LIST_CHANGED' } } })).toBe(false);
    expect(isBorrowerListChanged(new Error('boom'))).toBe(false);
  });
});
