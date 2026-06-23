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
});
