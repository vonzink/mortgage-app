import { hmdaStatus } from './reviewSummary';

describe('hmdaStatus', () => {
  test('flags missing when nothing is provided or declined', () => {
    expect(hmdaStatus({})).toEqual({ label: 'Not provided', missing: true });
    expect(hmdaStatus(undefined)).toEqual({ label: 'Not provided', missing: true });
  });

  test('reports provided when any demographic is present', () => {
    expect(hmdaStatus({ hmdaRace: '5' })).toEqual({ label: 'Provided', missing: false });
    expect(hmdaStatus({ hmdaEthnicity: '2' })).toEqual({ label: 'Provided', missing: false });
    expect(hmdaStatus({ hmdaSex: 'Male' })).toEqual({ label: 'Provided', missing: false });
  });

  test('reports declined when a refusal box is checked (legally allowed)', () => {
    expect(hmdaStatus({ hmdaRaceRefusal: true })).toEqual({ label: 'Declined to provide', missing: false });
  });

  test('provided takes precedence over a stray refusal flag', () => {
    expect(hmdaStatus({ hmdaRace: '5', hmdaSexRefusal: true })).toEqual({ label: 'Provided', missing: false });
  });
});
