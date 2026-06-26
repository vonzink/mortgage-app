import { toIntakeRequest, toCarryOverData } from './continuePrefill';

const PAYLOAD = {
  sourceLeadId: 'lead-1', loanPurpose: 'Purchase',
  borrower: { firstName: 'Ann', lastName: 'Buyer', email: 'ann@example.com', phone: '555-0100' },
  property: { addressLine: '1 Main St', city: 'Denver', state: 'CO', zipCode: '80202',
              propertyUse: 'Primary residence', propertyType: 'Single Family', propertyValue: null },
  display: { purchasePrice: 425000, downPaymentPercent: '20%' },
  loanOfficer: { name: 'Zachary Zink', slug: 'zachary-zink' },
};

test('toIntakeRequest maps to suite IntakeRequest shape', () => {
  const r = toIntakeRequest(PAYLOAD);
  expect(r.sourceLeadId).toBe('lead-1');
  expect(r.loanPurpose).toBe('PURCHASE');
  expect(r.borrower).toEqual({ firstName: 'Ann', lastName: 'Buyer', email: 'ann@example.com', phone: '555-0100' });
  expect(r.property).toEqual({ addressLine1: '1 Main St', city: 'Denver', state: 'CO',
    postalCode: '80202', estimatedValue: 425000 });
});

test('toCarryOverData maps to the form initial-values shape', () => {
  const d = toCarryOverData(PAYLOAD);
  expect(d.loanPurpose).toBe('Purchase');
  expect(d.propertyValue).toBe(425000);
  expect(d.property).toMatchObject({ addressLine: '1 Main St', city: 'Denver', state: 'CO', zipCode: '80202' });
  expect(d.borrowers[0]).toMatchObject({ firstName: 'Ann', lastName: 'Buyer', email: 'ann@example.com' });
  // address present → not TBD
  expect(d.propertyTBD).toBe(false);
});

test('toCarryOverData derives down-payment dollars from a percent string', () => {
  const d = toCarryOverData(PAYLOAD); // 20% of 425,000
  expect(d.downPayment).toBe(85000);
});

test('toCarryOverData auto-calculates the purchase loan amount (price - down payment)', () => {
  const d = toCarryOverData(PAYLOAD); // 425,000 - 85,000
  expect(d.loanAmount).toBe(340000);
});

test('toCarryOverData treats a down-payment value > 100 as a dollar amount', () => {
  const d = toCarryOverData({ ...PAYLOAD, display: { purchasePrice: 425000, downPaymentPercent: '90,000' } });
  expect(d.downPayment).toBe(90000);
  expect(d.loanAmount).toBe(335000);
});

test('toCarryOverData normalizes the borrower phone to NNN-NNN-NNNN', () => {
  const d = toCarryOverData({ ...PAYLOAD, borrower: { ...PAYLOAD.borrower, phone: '+1 (555) 123-4567' } });
  expect(d.borrowers[0].phone).toBe('555-123-4567');
});

test('toCarryOverData auto-checks TBD for a purchase with no property address', () => {
  const d = toCarryOverData({
    ...PAYLOAD,
    property: { addressLine: null, city: null, state: null, zipCode: null, propertyUse: null, propertyType: null, propertyValue: null },
  });
  expect(d.propertyTBD).toBe(true);
});

test('toCarryOverData leaves TBD false for a refinance even with no address', () => {
  const d = toCarryOverData({
    ...PAYLOAD,
    loanPurpose: 'Refinance',
    property: { addressLine: null, city: null, state: null, zipCode: null, propertyUse: null, propertyType: null, propertyValue: null },
  });
  expect(d.propertyTBD).toBe(false);
  // refinance loan amount is direct (not auto-derived from a down payment)
  expect(d.loanAmount).toBeNull();
});
