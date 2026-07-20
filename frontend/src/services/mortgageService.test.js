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
