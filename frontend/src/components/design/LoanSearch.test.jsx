import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoanSearch from './LoanSearch';
import mortgageService from '../../services/mortgageService';
import { pushRecentLoan, clearRecentLoans } from '../../utils/recentLoans';

jest.mock('../../services/mortgageService', () => ({
  __esModule: true,
  default: { searchLoans: jest.fn() },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function renderSearch() {
  return render(
    <MemoryRouter>
      <LoanSearch />
    </MemoryRouter>
  );
}

// Highlighted matches split text across <mark> nodes; collapse for matching.
function textIncluding(needle) {
  return (_, node) => {
    if (!node) return false;
    const hasText = (n) => n.textContent && n.textContent.includes(needle);
    const nodeHasText = hasText(node);
    const childrenDontHaveText = Array.from(node.children).every((c) => !hasText(c));
    return nodeHasText && childrenDontHaveText;
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  mortgageService.searchLoans.mockReset();
  mockNavigate.mockReset();
  clearRecentLoans();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('LoanSearch', () => {
  test('renders an input with the find-a-loan placeholder', () => {
    renderSearch();
    expect(screen.getByPlaceholderText(/find a loan/i)).toBeInTheDocument();
  });

  test('does not query until 2 characters are typed', async () => {
    renderSearch();
    const input = screen.getByPlaceholderText(/find a loan/i);
    fireEvent.change(input, { target: { value: 'a' } });
    await act(async () => { jest.advanceTimersByTime(300); });
    expect(mortgageService.searchLoans).not.toHaveBeenCalled();
  });

  test('queries after debounce with 2+ characters', async () => {
    mortgageService.searchLoans.mockResolvedValue([
      { id: 1, applicationNumber: 'APP-001', borrowerName: 'Fortney, Matthew',
        city: 'Lehi', state: 'UT', status: 'UNDERWRITING' },
    ]);
    renderSearch();
    const input = screen.getByPlaceholderText(/find a loan/i);
    fireEvent.change(input, { target: { value: 'for' } });

    await act(async () => { jest.advanceTimersByTime(250); });
    await waitFor(() => expect(mortgageService.searchLoans).toHaveBeenCalledWith('for', expect.any(Object)));
    await waitFor(() => expect(screen.getByText(textIncluding('Fortney, Matthew'))).toBeInTheDocument());
  });

  test('rapid retype cancels the in-flight request (abort)', async () => {
    const calls = [];
    mortgageService.searchLoans.mockImplementation((q, opts) => {
      calls.push({ q, signal: opts?.signal });
      return new Promise(() => {}); // never resolves
    });
    renderSearch();
    const input = screen.getByPlaceholderText(/find a loan/i);

    fireEvent.change(input, { target: { value: 'for' } });
    await act(async () => { jest.advanceTimersByTime(250); });
    fireEvent.change(input, { target: { value: 'fortney' } });
    await act(async () => { jest.advanceTimersByTime(250); });

    expect(calls[0].signal?.aborted).toBe(true);
  });

  test('Enter on highlighted row opens the loan in the suite console', async () => {
    const prevSuiteUrl = process.env.REACT_APP_SUITE_WEB_URL;
    process.env.REACT_APP_SUITE_WEB_URL = 'https://suite.msfgco.com';
    const assignMock = jest.fn();
    const origLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign: assignMock, href: 'http://localhost/', hostname: 'localhost', protocol: 'http:' },
    });
    try {
      mortgageService.searchLoans.mockResolvedValue([
        { id: 42, applicationNumber: 'APP-042', borrowerName: 'Sawaged, Veronica',
          city: 'Provo', state: 'UT', status: 'CTC' },
      ]);
      renderSearch();
      const input = screen.getByPlaceholderText(/find a loan/i);
      fireEvent.change(input, { target: { value: 'saw' } });
      await act(async () => { jest.advanceTimersByTime(250); });
      await waitFor(() => screen.getByText(textIncluding('Sawaged, Veronica')));

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(assignMock).toHaveBeenCalledWith('https://suite.msfgco.com/loans/42');
      expect(mockNavigate).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: origLocation });
      process.env.REACT_APP_SUITE_WEB_URL = prevSuiteUrl;
    }
  });

  test('Esc closes the dropdown', async () => {
    mortgageService.searchLoans.mockResolvedValue([
      { id: 1, applicationNumber: 'APP-001', borrowerName: 'Anyone',
        city: 'X', state: 'X', status: 'APPLICATION' },
    ]);
    renderSearch();
    const input = screen.getByPlaceholderText(/find a loan/i);
    fireEvent.change(input, { target: { value: 'any' } });
    await act(async () => { jest.advanceTimersByTime(250); });
    await waitFor(() => screen.getByText(textIncluding('Anyone')));

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByText(textIncluding('Anyone'))).not.toBeInTheDocument();
  });

  test('empty-state shows up to 5 recently-opened loans', async () => {
    pushRecentLoan({ id: 11, applicationNumber: 'APP-011', borrowerName: 'Recent One' });
    pushRecentLoan({ id: 12, applicationNumber: 'APP-012', borrowerName: 'Recent Two' });

    renderSearch();
    const input = screen.getByPlaceholderText(/find a loan/i);
    fireEvent.focus(input);

    expect(screen.getByText(/Recent One/)).toBeInTheDocument();
    expect(screen.getByText(/Recent Two/)).toBeInTheDocument();
    expect(mortgageService.searchLoans).not.toHaveBeenCalled();
  });

  test('"no matches" shows a Browse-all link', async () => {
    mortgageService.searchLoans.mockResolvedValue([]);
    renderSearch();
    const input = screen.getByPlaceholderText(/find a loan/i);
    fireEvent.change(input, { target: { value: 'zzznomatch' } });
    await act(async () => { jest.advanceTimersByTime(250); });

    await waitFor(() => expect(screen.getByText(/no loans match/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /browse all/i })).toHaveAttribute(
      'href',
      expect.stringContaining('zzznomatch'),
    );
  });
});
