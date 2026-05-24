/**
 * Per-status SLA thresholds (in days). The pipeline row paints "day N" copper
 * once it exceeds `warn` and adds a danger marker past `alarm`. v1 are
 * constants; move to a config table only if real usage demands per-loan-type
 * tuning. Keys must match LoanStatus.java in the backend.
 */
export const STAGE_SLAS = {
  REGISTERED:        { warn: 5,  alarm: 10 },
  APPLICATION:       { warn: 7,  alarm: 14 },
  DISCLOSURES_SENT:  { warn: 3,  alarm: 7 },
  DISCLOSURES_SIGNED:{ warn: 5,  alarm: 10 },
  UNDERWRITING:      { warn: 7,  alarm: 14 },
  APPROVED:          { warn: 5,  alarm: 10 },
  APPRAISAL:         { warn: 10, alarm: 21 },
  INSURANCE:         { warn: 7,  alarm: 14 },
  CTC:               { warn: 3,  alarm: 7 },
  DOCS_OUT:          { warn: 3,  alarm: 7 },
  FUNDED:            { warn: 99, alarm: 999 }, // terminal — no warn
  DISPOSITIONED:     { warn: 99, alarm: 999 },
};

/**
 * Tone for the "day N" sublabel.
 * @param {string} status
 * @param {number} days
 * @returns {'ok'|'warn'|'alarm'}
 */
export function stageTone(status, days) {
  const sla = STAGE_SLAS[status] || { warn: 7, alarm: 14 };
  if (days >= sla.alarm) return 'alarm';
  if (days >= sla.warn) return 'warn';
  return 'ok';
}
