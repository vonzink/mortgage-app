/**
 * Loan Dashboard service.
 *
 * ── msfg-suite cutover ────────────────────────────────────────────────────────
 * The LO dashboard is repointed off the legacy mortgage-app backend onto the
 * msfg-suite system of record. Every call now hits `suiteClient` against the
 * already-built suite `dashboard`/`conditions`/`notes`/status endpoints:
 *
 *   read:   GET   /loans/{id}/dashboard               → adaptSuiteDashboard()
 *   terms:  PATCH /loans/{id}/dashboard/terms         (mapped DashboardTermsPatch)
 *   status: POST  /loans/{id}/status                  ({ targetStatus, transitionedAt, reason })
 *   trans:  GET   /loans/{id}/status/transitions      (legal next-states for the modal)
 *   conds:  GET/POST/PATCH/DELETE /loans/{id}/conditions{/cid}
 *   notes:  GET/POST/DELETE       /loans/{id}/notes{/nid}
 *
 * The suite wraps responses in an { success, data } envelope; the read adapter
 * (mortgageService.adaptSuiteDashboard) unwraps + reshapes into the exact shape
 * LoanDashboardPage consumes. The loanId is a suite UUID (carried by the pipeline
 * row / search hit).
 */
import { suiteClient } from './apiClient';
import { adaptSuiteDashboard, unwrapEnvelope } from './mortgageService';

/**
 * Map the EditTermsModal form (old field names) → the suite DashboardTermsPatch.
 * Renames: noteRatePercent→interestRate, amortizationTermMonths→loanTermMonths,
 * lienPriorityType→lienPriority. `loanPurpose`/`applicationReceivedDate` pass through
 * (new suite fields). Only keys present in the incoming patch are forwarded, so the
 * modal's empty-field stripping (PATCH = non-null merge) is preserved.
 */
function mapTermsToSuite(terms = {}) {
  const RENAME = {
    noteRatePercent: 'interestRate',
    amortizationTermMonths: 'loanTermMonths',
    lienPriorityType: 'lienPriority',
  };
  const out = {};
  for (const [k, v] of Object.entries(terms)) {
    out[RENAME[k] || k] = v;
  }
  return out;
}

const dashboardService = {
  /** GET — full dashboard payload, adapted from the suite DashboardResponse envelope. */
  getDashboard: async (loanId) => {
    const { data } = await suiteClient.get(`/loans/${loanId}/dashboard`);
    return adaptSuiteDashboard(data);
  },

  /** PATCH — partial update of loan terms. Field names are mapped to the suite DTO. */
  patchTerms: async (loanId, terms) => {
    const { data } = await suiteClient.patch(
      `/loans/${loanId}/dashboard/terms`,
      mapTermsToSuite(terms),
    );
    return unwrapEnvelope(data);
  },

  /**
   * POST — change loan status (suite TransitionRequest). The suite records a
   * loan_status_history row. Optional `transitionedAt` (ISO date "2026-05-13" or
   * full datetime) backdates the milestone; omitted → suite stamps now().
   * Optional `reason` is carried into the history row.
   */
  updateStatus: async (loanId, status, transitionedAt, reason) => {
    const body = { targetStatus: status };
    if (transitionedAt) body.transitionedAt = transitionedAt;
    if (reason) body.reason = reason;
    const { data } = await suiteClient.post(`/loans/${loanId}/status`, body);
    return unwrapEnvelope(data);
  },

  /**
   * GET — the suite's server-authoritative allowed next-states for this loan
   * ({ currentStatus, allowedTransitions }). Feeds the AdvanceStatusModal so it
   * only offers legal transitions. Returns [] of targets on failure.
   */
  getTransitions: async (loanId) => {
    const { data } = await suiteClient.get(`/loans/${loanId}/status/transitions`);
    const env = unwrapEnvelope(data) || {};
    return {
      currentStatus: env.currentStatus ?? null,
      allowedTransitions: Array.isArray(env.allowedTransitions) ? env.allowedTransitions : [],
    };
  },

  /** POST — add a new UW condition (suite UpsertConditionRequest). */
  createCondition: async (loanId, payload) => {
    const { data } = await suiteClient.post(`/loans/${loanId}/conditions`, payload);
    return unwrapEnvelope(data);
  },

  /** PATCH — update a condition (status, notes, due date, type, assignment). */
  updateCondition: async (loanId, conditionId, patch) => {
    const { data } = await suiteClient.patch(
      `/loans/${loanId}/conditions/${conditionId}`,
      patch,
    );
    return unwrapEnvelope(data);
  },

  /** DELETE — soft-remove a condition. */
  deleteCondition: async (loanId, conditionId) => {
    await suiteClient.delete(`/loans/${loanId}/conditions/${conditionId}`);
  },

  /** POST — add a loan note. */
  createNote: async (loanId, content) => {
    const { data } = await suiteClient.post(`/loans/${loanId}/notes`, { content });
    return unwrapEnvelope(data);
  },

  /** DELETE — remove a loan note. */
  deleteNote: async (loanId, noteId) => {
    await suiteClient.delete(`/loans/${loanId}/notes/${noteId}`);
  },
};

export default dashboardService;
