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

  /** PATCH — change loan status. Backend writes a loan_status_history row. */
  updateStatus: async (loanId, status, note) => {
    const { data } = await apiClient.patch(
      `/loan-applications/${loanId}/status`,
      { status, note },
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
};

export default dashboardService;
