import { statusTone, STATUS_TONE } from './helpers';

/**
 * The tone map is keyed on the suite's `LoanStatus` enum, so it is pinned to the enum itself —
 * transcribed from loan-core/src/main/java/com/msfg/los/loan/domain/LoanStatus.java. Statuses were
 * APPENDED to that enum after this map was first written (the MSFG operational board), and the
 * additions fell through to the default: a rescinded or held loan rendered in the same neutral
 * tone as one that had just started. A table is the only thing that catches that class of drift.
 */
const LOAN_STATUS_TONES = [
  // Original pipeline
  ['STARTED', 'muted'],
  ['APPLICATION_IN_PROGRESS', 'muted'],
  ['SUBMITTED', 'review'],
  ['IN_UNDERWRITING', 'review'],
  ['APPROVED_WITH_CONDITIONS', 'review'],
  ['CLEAR_TO_CLOSE', 'active'],
  ['CLOSING', 'active'],
  ['FUNDED', 'active'],
  ['WITHDRAWN', 'danger'],
  ['CANCELLED', 'danger'],
  ['DENIED', 'danger'],
  ['SUSPENDED', 'danger'],
  // MSFG operational board
  ['NEW_LOAN', 'muted'],
  ['REGISTERED', 'muted'],
  ['NOT_READY_TO_SUBMIT', 'muted'],
  ['READY_TO_SUBMIT', 'review'],
  ['RESUBMITTED', 'review'],
  ['CONDITIONS_PENDING', 'review'],
  ['CONDITIONS_SENT', 'review'],
  ['BALANCED_FOR_CLOSING', 'active'],
  ['CLOSING_DOCS_OUT', 'active'],
  ['CLOSED', 'active'],
  ['WAITING_FOR_B1_REIMBURSEMENT', 'review'],
  // Recoverable and waiting on someone — amber, not the red reserved for loans that are over.
  ['HOLD', 'warn'],
  ['HOLD_ON_COLLECTION', 'warn'],
  ['NOT_ACTIVE_LOAN', 'danger'],
  ['DL_RESCINDED', 'danger'],
  ['DL_NOT_ACCEPTED', 'danger'],
  ['DL_INCOMPLETE', 'danger'],
];

describe('statusTone', () => {
  test.each(LOAN_STATUS_TONES)('%s → %s', (status, tone) => {
    expect(statusTone(status)).toBe(tone);
  });

  test('every LoanStatus value is mapped — none falls through to the default', () => {
    LOAN_STATUS_TONES.forEach(([status]) => {
      expect(STATUS_TONE).toHaveProperty(status);
    });
    // Nothing invented: a key here that is not a real LoanStatus is dead weight that reads as
    // coverage. `CTC`, `DOCS_OUT`, `DISPOSITIONED` and `APPLICATION` were exactly that.
    const known = new Set(LOAN_STATUS_TONES.map(([status]) => status));
    expect(Object.keys(STATUS_TONE).filter((k) => !known.has(k))).toEqual([]);
  });

  test('an unknown or missing status is neutral, never a false signal', () => {
    expect(statusTone('NOT_A_STATUS')).toBe('muted');
    expect(statusTone(undefined)).toBe('muted');
  });
});
