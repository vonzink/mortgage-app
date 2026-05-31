/** Status workflow that drives the status dropdown order. Mirrors LoanStatus.java. */
export const STATUS_ORDER = [
  'REGISTERED', 'APPLICATION', 'DISCLOSURES_SENT', 'DISCLOSURES_SIGNED',
  'UNDERWRITING', 'APPROVED', 'APPRAISAL', 'INSURANCE',
  'CTC', 'DOCS_OUT', 'FUNDED', 'DISPOSITIONED',
];

/** The 8 milestones drawn in the new timeline strip. Maps from LoanStatus values. */
export const MILESTONE_DEFS = [
  { key: 'APPLICATION',         label: 'Application' },
  { key: 'DISCLOSURES_SIGNED',  label: 'Disclosures' },
  { key: 'UNDERWRITING',        label: 'Underwriting' },
  { key: 'APPRAISAL',           label: 'Appraisal' },
  { key: 'INSURANCE',           label: 'Insurance' },
  { key: 'CTC',                 label: 'Clear to close' },
  { key: 'DOCS_OUT',            label: 'Docs out' },
  { key: 'FUNDED',              label: 'Funded' },
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
  const pretty = status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
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
