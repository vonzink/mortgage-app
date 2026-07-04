import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoanSuiteRedirect from './LoanSuiteRedirect';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/loan/:loanId" element={<LoanSuiteRedirect />} />
        <Route path="/applications" element={<div>PIPELINE</div>} />
      </Routes>
    </MemoryRouter>
  );
}

let replaceMock;
const origEnv = { ...process.env };

beforeEach(() => {
  replaceMock = jest.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { replace: replaceMock, hostname: 'localhost', protocol: 'http:' },
  });
});

afterEach(() => {
  process.env.REACT_APP_SUITE_WEB_URL = origEnv.REACT_APP_SUITE_WEB_URL || '';
});

test('forwards /loan/:id to the console loan workspace (passthrough of the suite id)', () => {
  process.env.REACT_APP_SUITE_WEB_URL = 'https://suite.msfgco.com';
  renderAt('/loan/L9');
  expect(replaceMock).toHaveBeenCalledWith('https://suite.msfgco.com/loans/L9');
  expect(screen.getByTestId('loan-suite-redirect')).toBeInTheDocument();
});

test('console not configured → falls back to the in-app pipeline, no external redirect', () => {
  process.env.REACT_APP_SUITE_WEB_URL = '';
  renderAt('/loan/L9');
  expect(replaceMock).not.toHaveBeenCalled();
  expect(screen.getByText('PIPELINE')).toBeInTheDocument();
});
