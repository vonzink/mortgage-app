import mortgageService from './mortgageService';
import { suiteClient } from './apiClient';

jest.mock('./apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
  suiteClient: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));

describe('getSuiteApplication', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GETs /loans/{id}/application and unwraps the envelope', async () => {
    suiteClient.get.mockResolvedValueOnce({
      data: { success: true, data: { loanId: 'L1', loanNumber: '1001', borrower: { firstName: 'Ada' }, loan: { city: 'Denver' } } },
    });
    const app = await mortgageService.getSuiteApplication('L1');
    expect(suiteClient.get).toHaveBeenCalledWith('/loans/L1/application');
    expect(app.borrower.firstName).toBe('Ada');
    expect(app.loan.city).toBe('Denver');
  });

  it('returns null on error (never throws)', async () => {
    suiteClient.get.mockRejectedValueOnce(new Error('403'));
    await expect(mortgageService.getSuiteApplication('L1')).resolves.toBeNull();
  });
});

describe('getSuiteApplication borrowerListVersion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps the borrowerListVersion on the unwrapped application', async () => {
    suiteClient.get.mockResolvedValueOnce({
      data: { success: true, data: { loanId: 'L1', borrowerListVersion: 'v1' } },
    });
    const app = await mortgageService.getSuiteApplication('L1');
    expect(app.borrowerListVersion).toBe('v1');
  });
});

describe('getSuiteApplicationListVersion', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GETs /loans/{id}/application and returns only the borrowerListVersion', async () => {
    suiteClient.get.mockResolvedValueOnce({
      data: { success: true, data: { loanId: 'L1', borrowerListVersion: 'v7', borrower: { firstName: 'Ada' } } },
    });
    await expect(mortgageService.getSuiteApplicationListVersion('L1')).resolves.toBe('v7');
    expect(suiteClient.get).toHaveBeenCalledWith('/loans/L1/application');
  });

  it('returns null when the response has no version', async () => {
    suiteClient.get.mockResolvedValueOnce({ data: { success: true, data: { loanId: 'L1' } } });
    await expect(mortgageService.getSuiteApplicationListVersion('L1')).resolves.toBeNull();
  });

  it('returns null on error (never throws)', async () => {
    suiteClient.get.mockRejectedValueOnce(new Error('403'));
    await expect(mortgageService.getSuiteApplicationListVersion('L1')).resolves.toBeNull();
  });
});

describe('getPublicLoPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GETs /public/lo-pages/{slug} (URL-encoded) and unwraps the envelope', async () => {
    suiteClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: { slug: 'zack-zink', displayName: 'Zack Zink', nmlsId: '123456' },
      },
    });
    const page = await mortgageService.getPublicLoPage('zack-zink');
    expect(suiteClient.get).toHaveBeenCalledWith('/public/lo-pages/zack-zink');
    expect(page.displayName).toBe('Zack Zink');
    expect(page.nmlsId).toBe('123456');
  });

  it('returns null on failure — unknown/disabled slug 404s (never throws)', async () => {
    suiteClient.get.mockRejectedValueOnce(new Error('404'));
    await expect(mortgageService.getPublicLoPage('nobody')).resolves.toBeNull();
  });
});
