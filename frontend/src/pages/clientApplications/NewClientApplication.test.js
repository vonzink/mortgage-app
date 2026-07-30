import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import NewClientApplication from './NewClientApplication';
import mortgageService from '../../services/mortgageService';
import { setClientContext, clearClientContext } from '../clientView/clientContext';

jest.mock('../../services/mortgageService');

let mockRoles = { isStaff: true, isBorrower: false };
jest.mock('../../hooks/useRoles', () => () => mockRoles);

/** Renders the /apply landing so navigation assertions can read the real query string. */
function ApplyProbe() {
  const { pathname, search } = useLocation();
  return <div data-testid="apply-probe">{`${pathname}${search}`}</div>;
}

function renderAt(borrowerId = 'B7') {
  return render(
    <MemoryRouter initialEntries={[`/client/${borrowerId}/applications/new`]}>
      <Routes>
        <Route path="/client/:borrowerId/applications/new" element={<NewClientApplication />} />
        <Route path="/client/:borrowerId/applications" element={<div data-testid="list-probe" />} />
        <Route path="/apply" element={<ApplyProbe />} />
        <Route path="/" element={<div data-testid="home" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const startButton = () => screen.getByRole('button', { name: /start application/i });

beforeEach(() => {
  mockRoles = { isStaff: true, isBorrower: false };
  clearClientContext();
  setClientContext({ borrowerId: 'B7', loanId: 'L1', name: 'Jane Doe' });
  mortgageService.createLoanForClient = jest.fn().mockResolvedValue({ loanId: 'L9', loanNumber: '9009' });
});

it('confirms before creating anything — nothing is created on mount', () => {
  renderAt();

  expect(screen.getByText(/start a new application for jane doe\?/i)).toBeInTheDocument();
  expect(mortgageService.createLoanForClient).not.toHaveBeenCalled();
});

it('degrades to "this client" when the context stash is absent', () => {
  clearClientContext();
  renderAt();

  expect(screen.getByText(/start a new application for this client\?/i)).toBeInTheDocument();
});

it('offers exactly the server-supported loan purposes', () => {
  renderAt();

  expect(screen.getByLabelText(/purchase/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/refinance/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/construction/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/other/i)).toBeInTheDocument();
  expect(screen.getAllByRole('radio')).toHaveLength(4);
});

it('does not pre-pick a purpose for the user', () => {
  renderAt();

  screen.getAllByRole('radio').forEach((r) => expect(r).not.toBeChecked());
});

it('creates the loan with the chosen purpose and navigates to the new loan', async () => {
  renderAt('B42');

  fireEvent.click(screen.getByLabelText(/refinance/i));
  fireEvent.click(startButton());

  await waitFor(() =>
    expect(screen.getByTestId('apply-probe')).toHaveTextContent('/apply?loan=L9'),
  );
  expect(mortgageService.createLoanForClient).toHaveBeenCalledWith('B42', 'REFINANCE');
});

it('creates exactly ONE loan when the start control is double-clicked', async () => {
  let resolveCreate;
  mortgageService.createLoanForClient = jest.fn(
    () => new Promise((r) => { resolveCreate = r; }),
  );
  renderAt();

  fireEvent.click(screen.getByLabelText(/purchase/i));
  const btn = startButton();

  // Both clicks dispatched inside ONE act batch: React has not re-rendered between them, so
  // the `disabled` prop is still false when the second lands. Only an entry guard on the
  // handler itself can stop the second create — this is the test for that guard.
  await act(async () => {
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  expect(mortgageService.createLoanForClient).toHaveBeenCalledTimes(1);

  await act(async () => { resolveCreate({ loanId: 'L9' }); });
  await waitFor(() =>
    expect(screen.getByTestId('apply-probe')).toHaveTextContent('/apply?loan=L9'),
  );
});

it('surfaces a failure and re-enables the control so staff can retry', async () => {
  mortgageService.createLoanForClient = jest.fn().mockRejectedValueOnce(new Error('boom'));
  renderAt();

  fireEvent.click(screen.getByLabelText(/purchase/i));
  fireEvent.click(startButton());

  expect(await screen.findByText(/couldn.t start/i)).toBeInTheDocument();
  expect(startButton()).not.toBeDisabled();

  mortgageService.createLoanForClient.mockResolvedValueOnce({ loanId: 'L9' });
  fireEvent.click(startButton());

  await waitFor(() =>
    expect(screen.getByTestId('apply-probe')).toHaveTextContent('/apply?loan=L9'),
  );
});

it('cancels back to the client applications list without creating anything', async () => {
  renderAt('B42');

  fireEvent.click(screen.getByRole('link', { name: /cancel/i }));

  await waitFor(() => expect(screen.getByTestId('list-probe')).toBeInTheDocument());
  expect(mortgageService.createLoanForClient).not.toHaveBeenCalled();
});

it('redirects a non-staff session and never creates a loan', async () => {
  mockRoles = { isStaff: false, isBorrower: true };
  renderAt();

  await waitFor(() => expect(screen.getByTestId('home')).toBeInTheDocument());
  expect(screen.queryByRole('button', { name: /start application/i })).not.toBeInTheDocument();
  expect(mortgageService.createLoanForClient).not.toHaveBeenCalled();
});
