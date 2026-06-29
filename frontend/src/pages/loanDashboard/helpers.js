/**
 * Status workflow helpers for the LO dashboard.
 *
 * ── msfg-suite cutover ────────────────────────────────────────────────────────
 * The dashboard now speaks the suite `LoanStatus` vocabulary (the suite is the
 * system of record). The old mortgage-app 12-state model
 * (REGISTERED, APPLICATION, DISCLOSURES_SENT, DISCLOSURES_SIGNED, UNDERWRITING,
 *  APPROVED, APPRAISAL, INSURANCE, CTC, DOCS_OUT, FUNDED, DISPOSITIONED) is
 *  replaced wholesale by the suite enum:
 *
 *   STARTED, APPLICATION_IN_PROGRESS, SUBMITTED, IN_UNDERWRITING,
 *   APPROVED_WITH_CONDITIONS, CLEAR_TO_CLOSE, CLOSING, FUNDED,
 *   WITHDRAWN, CANCELLED, DENIED, SUSPENDED
 *
 * The first 8 are the forward "happy path" (drive the milestone strip + progress);
 * the last 4 are terminal/exception states the old model lacked. The Advance-status
 * modal's legal targets are now driven server-side by GET /status/transitions, not
 * by this array — STATUS_ORDER only feeds ordering/progress + a default-next hint.
 */
export const STATUS_ORDER = [
  'STARTED', 'APPLICATION_IN_PROGRESS', 'SUBMITTED', 'IN_UNDERWRITING',
  'APPROVED_WITH_CONDITIONS', 'CLEAR_TO_CLOSE', 'CLOSING', 'FUNDED',
  'WITHDRAWN', 'CANCELLED', 'DENIED', 'SUSPENDED',
];

/** Human labels for each suite LoanStatus (drives chips + the "To" dropdown copy). */
export const STATUS_LABELS = {
  STARTED: 'Started',
  APPLICATION_IN_PROGRESS: 'Application in progress',
  SUBMITTED: 'Submitted',
  IN_UNDERWRITING: 'In underwriting',
  APPROVED_WITH_CONDITIONS: 'Approved with conditions',
  CLEAR_TO_CLOSE: 'Clear to close',
  CLOSING: 'Closing',
  FUNDED: 'Funded',
  WITHDRAWN: 'Withdrawn',
  CANCELLED: 'Cancelled',
  DENIED: 'Denied',
  SUSPENDED: 'Suspended',
};

/**
 * Tone bucket for the status chip/pill colour. Greens for forward progress,
 * red for the failure terminals, amber for the in-flight/exception ones.
 */
export const STATUS_TONE = {
  STARTED: 'muted',
  APPLICATION_IN_PROGRESS: 'muted',
  SUBMITTED: 'review',
  IN_UNDERWRITING: 'review',
  APPROVED_WITH_CONDITIONS: 'review',
  CLEAR_TO_CLOSE: 'active',
  CLOSING: 'active',
  FUNDED: 'active',
  WITHDRAWN: 'danger',
  CANCELLED: 'danger',
  DENIED: 'danger',
  SUSPENDED: 'danger',
};

/** Map a suite LoanStatus → a Pill tone token (default 'muted' for unknowns). */
export function statusTone(status) {
  return STATUS_TONE[status] || 'muted';
}

/** Map a suite LoanStatus → a human label (falls back to a prettified enum). */
export function statusLabel(status) {
  if (!status) return null;
  return STATUS_LABELS[status]
    || (status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' '));
}

/** The forward "happy path" milestones drawn in the timeline strip. */
export const MILESTONE_DEFS = [
  { key: 'STARTED',                  label: 'Started' },
  { key: 'APPLICATION_IN_PROGRESS',  label: 'Application' },
  { key: 'SUBMITTED',                label: 'Submitted' },
  { key: 'IN_UNDERWRITING',          label: 'Underwriting' },
  { key: 'APPROVED_WITH_CONDITIONS', label: 'Approved' },
  { key: 'CLEAR_TO_CLOSE',           label: 'Clear to close' },
  { key: 'CLOSING',                  label: 'Closing' },
  { key: 'FUNDED',                   label: 'Funded' },
];

export function statusReachedIndex(status) {
  if (!status) return -1;
  // Map each LoanStatus to its corresponding milestone index, treating
  // intermediate states as "still on the previous milestone."
  const ord = STATUS_ORDER.indexOf(status);
  if (ord < 0) return -1;
  const milestoneOrdinals = MILESTONE_DEFS.map((m) => STATUS_ORDER.indexOf(m.key));
  let reached = -1;
  milestoneOrdinals.forEach((o, i) => { if (ord >= o) reached = i; });
  return reached;
}

export function buildMilestones(currentStatus, history) {
  const reached = statusReachedIndex(currentStatus);
  const histByKey = new Map();
  (history || []).forEach((h) => {
    // Capture the earliest occurrence of each status — the milestone "date" should
    // reflect when we first hit it, not the most recent revisit.
    if (!histByKey.has(h.status)) histByKey.set(h.status, h.transitionedAt);
  });
  return MILESTONE_DEFS.map((m, i) => {
    const date = histByKey.get(m.key);
    const formatted = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : '—';
    const state = i < reached ? 'done' : i === reached ? 'current' : 'todo';
    return { label: m.label, date: formatted, state };
  });
}

export function buildStatusLabel(status, history) {
  if (!status) return null;
  const pretty = statusLabel(status);
  // Find when we entered this status to compute "day N"
  const entry = (history || []).find((h) => h.status === status);
  if (!entry?.transitionedAt) return pretty;
  const days = Math.max(1, Math.round((Date.now() - new Date(entry.transitionedAt).getTime()) / 86_400_000));
  return `${pretty} · day ${days}`;
}

export function computeDaysElapsed(history) {
  if (!history || history.length === 0) return null;
  const first = history.reduce((earliest, h) => {
    if (!h.transitionedAt) return earliest;
    if (!earliest) return h.transitionedAt;
    return new Date(h.transitionedAt) < new Date(earliest) ? h.transitionedAt : earliest;
  }, null);
  if (!first) return null;
  return Math.max(0, Math.round((Date.now() - new Date(first).getTime()) / 86_400_000));
}

export function findProcessor(loanAgents) {
  const p = (loanAgents || []).find((a) => /processor/i.test(a.agentRole || ''));
  if (!p) return null;
  return p.user?.displayName || p.user?.email || null;
}
