import planColumns, { RAIL_KEYS, MAIN_KEYS, SIDE_KEYS } from './planColumns';

const DEFAULTS = { rail: RAIL_KEYS, main: MAIN_KEYS, side: SIDE_KEYS };

describe('planColumns', () => {
  test('null / undefined / non-object layout → default columns untouched', () => {
    expect(planColumns(null)).toEqual(DEFAULTS);
    expect(planColumns(undefined)).toEqual(DEFAULTS);
    expect(planColumns('oops')).toEqual(DEFAULTS);
    expect(planColumns(42)).toEqual(DEFAULTS);
  });

  test('a full within-column permutation is respected verbatim', () => {
    expect(planColumns({
      rail: ['notifications', 'contacts', 'loanOfficer', 'milestones'],
      main: ['downloads', 'cleared', 'dropzone', 'todo'],
      side: ['closingCosts', 'payment', 'snapshot', 'appraisal', 'keyDates', 'rateLock'],
    })).toEqual({
      rail: ['notifications', 'contacts', 'loanOfficer', 'milestones'],
      main: ['downloads', 'cleared', 'dropzone', 'todo'],
      side: ['closingCosts', 'payment', 'snapshot', 'appraisal', 'keyDates', 'rateLock'],
    });
  });

  test('cross-column placement is honored (union contract: any key in any array)', () => {
    const plan = planColumns({
      rail: ['rateLock', 'milestones', 'loanOfficer', 'contacts', 'notifications'],
      main: ['todo', 'dropzone', 'cleared', 'downloads'],
      side: ['keyDates', 'appraisal', 'snapshot', 'payment', 'closingCosts'],
    });
    expect(plan.rail).toEqual(['rateLock', 'milestones', 'loanOfficer', 'contacts', 'notifications']);
    expect(plan.side).toEqual(['keyDates', 'appraisal', 'snapshot', 'payment', 'closingCosts']);
  });

  test('unknown keys are ignored (forward compat)', () => {
    const plan = planColumns({
      main: ['downloads', 'heroPhoto', 'todo', 'dropzone', 'cleared'],
    });
    expect(plan.main).toEqual(['downloads', 'todo', 'dropzone', 'cleared']);
  });

  test('keys missing from the whole layout append to their HOME column in default order', () => {
    const plan = planColumns({ side: ['closingCosts', 'payment'] });
    expect(plan.side).toEqual(['closingCosts', 'payment', 'rateLock', 'keyDates', 'appraisal', 'snapshot']);
    expect(plan.rail).toEqual(RAIL_KEYS);
    expect(plan.main).toEqual(MAIN_KEYS);
  });

  test('duplicates within or across arrays: global first occurrence wins (scan rail→main→side)', () => {
    const plan = planColumns({
      rail: ['contacts', 'milestones', 'contacts'],                   // dupe WITHIN one array
      main: ['todo', 'contacts', 'dropzone', 'cleared', 'downloads'], // dupe ACROSS arrays
    });
    expect(plan.rail).toEqual(['contacts', 'milestones', 'loanOfficer', 'notifications']);
    expect(plan.main).toEqual(['todo', 'dropzone', 'cleared', 'downloads']);
  });

  test('empty object / empty arrays / non-array columns → defaults (equivalent to no layout)', () => {
    expect(planColumns({})).toEqual(DEFAULTS);
    expect(planColumns({ rail: [], main: [], side: [] })).toEqual(DEFAULTS);
    expect(planColumns({ rail: 'oops', main: 7, side: null })).toEqual(DEFAULTS);
  });

  test('does not mutate its input', () => {
    const layout = { rail: ['contacts', 'bogus'], main: ['todo'], side: [] };
    planColumns(layout);
    expect(layout).toEqual({ rail: ['contacts', 'bogus'], main: ['todo'], side: [] });
  });
});
