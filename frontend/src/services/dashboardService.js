/**
 * Loan Dashboard service. Talks to /loan-applications/{loanId}/dashboard for
 * the aggregated read, plus PATCH/POST for edits (terms, conditions). Status
 * changes flow through mortgageService (PATCH /status) which also writes
 * loan_status_history; the dashboard reads that history back.
 */
import apiClient from './apiClient';

const dashboardService = {
  /** GET — full dashboard payload (terms, expenses, identifiers, borrower, property,
   *  status history, loan agents, closing info, purchase credits, conditions). */
  getDashboard: async (loanId) => {
    const { data } = await apiClient.get(`/loan-applications/${loanId}/dashboard`);
    return data;
  },

  /** PATCH — partial update of loan terms. Pass only the fields you want changed. */
  patchTerms: async (loanId, terms) => {
    const { data } = await apiClient.patch(
      `/loan-applications/${loanId}/dashboard/terms`,
      terms,
    );
    return data;
  },

  /**
   * PATCH — change loan status. Backend writes a loan_status_history row.
   * Optional `transitionedAt` (ISO date "2026-05-13" or full datetime) lets
   * the LO backdate a milestone; omitted → backend stamps now().
   *
   * Spring's @RequestParam reads from query params, not JSON bodies — that's
   * why the args go in the URL even though the verb is PATCH.
   */
  updateStatus: async (loanId, status, transitionedAt) => {
    const params = new URLSearchParams({ status });
    if (transitionedAt) params.set('transitionedAt', transitionedAt);
    const { data } = await apiClient.patch(
      `/loan-applications/${loanId}/status?${params.toString()}`,
    );
    return data;
  },

  /** POST — add a new UW condition. */
  createCondition: async (loanId, payload) => {
    const { data } = await apiClient.post(
      `/loan-applications/${loanId}/dashboard/conditions`,
      payload,
    );
    return data;
  },

  /** PATCH — update a condition (status, notes, due date, type, assignment). */
  updateCondition: async (loanId, conditionId, patch) => {
    const { data } = await apiClient.patch(
      `/loan-applications/${loanId}/dashboard/conditions/${conditionId}`,
      patch,
    );
    return data;
  },

  /** DELETE — remove a condition. */
  deleteCondition: async (loanId, conditionId) => {
    await apiClient.delete(
      `/loan-applications/${loanId}/dashboard/conditions/${conditionId}`,
    );
  },

  /** POST — add a loan note. */
  createNote: async (loanId, content) => {
    const { data } = await apiClient.post(
      `/loan-applications/${loanId}/dashboard/notes`,
      { content },
    );
    return data;
  },

  /** DELETE — remove a loan note. */
  deleteNote: async (loanId, noteId) => {
    await apiClient.delete(
      `/loan-applications/${loanId}/dashboard/notes/${noteId}`,
    );
  },
};

export default dashboardService;
