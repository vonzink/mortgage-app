/**
 * Loan Dashboard service. Talks to /loan-applications/{loanId}/dashboard, which
 * returns an aggregated view of loan terms, housing expenses, identifiers,
 * primary borrower summary, and property summary.
 */
import apiClient from './apiClient';

const dashboardService = {
  /** GET — read the aggregated dashboard payload for one loan. */
  getDashboard: async (loanId) => {
    const { data } = await apiClient.get(`/loan-applications/${loanId}/dashboard`);
    return data;
  },
};

export default dashboardService;
