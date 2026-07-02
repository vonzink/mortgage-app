/**
 * msfg-suite staff console (msfg-suite-web) origin — e.g. https://suite.msfgco.com.
 * Read lazily so tests can vary the env var; empty string = feature off.
 */
export function suiteWebUrl() {
  return (process.env.REACT_APP_SUITE_WEB_URL || '').replace(/\/$/, '');
}

/** Deep link to a loan's workspace in the console, or null when unconfigured. */
export function suiteLoanUrl(loanId) {
  const base = suiteWebUrl();
  return base && loanId ? `${base}/loans/${loanId}` : null;
}
