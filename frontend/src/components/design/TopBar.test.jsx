import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopBar, { detectActive } from './TopBar';
import {
  setClientContext, clearClientContext, getClientContext,
} from '../../pages/clientView/clientContext';

jest.mock('react-oidc-context', () => ({
  useAuth: () => ({ isLoading: false, isAuthenticated: false, user: null, removeUser: jest.fn() }),
}));

jest.mock('../../services/mortgageService', () => ({ __esModule: true, default: {} }));

let mockRoles = { isAdmin: false, isStaff: true };
jest.mock('../../hooks/useRoles', () => () => mockRoles);

function renderBar(at = '/applications') {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <TopBar />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockRoles = { isAdmin: false, isStaff: true };
  clearClientContext();
});

describe('client-scoped nav targets', () => {
  test('with a client in context the nav acts on that client', () => {
    setClientContext({ borrowerId: 'B7', loanId: 'L1', name: 'Jane Doe' });
    renderBar('/client-view/L1');

    expect(screen.getByRole('link', { name: /apply/i })).toHaveAttribute(
      'href', '/client/B7/applications/new',
    );
    expect(screen.getByRole('link', { name: /applications/i })).toHaveAttribute(
      'href', '/client/B7/applications',
    );
  });

  test('names the client the nav is scoped to, and clearing it restores the defaults', () => {
    setClientContext({ borrowerId: 'B7', loanId: 'L1', name: 'Jane Doe' });
    const { unmount } = renderBar('/client-view/L1');

    expect(screen.getByText(/working with jane doe/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /stop working with this client/i }));

    expect(screen.queryByText(/working with/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /apply/i })).toHaveAttribute('href', '/apply');
    expect(screen.getByRole('link', { name: /applications/i })).toHaveAttribute(
      'href', '/applications',
    );

    // The stash itself has to be gone, not just this render's copy of it — a surviving stash comes
    // back on the next navigation and re-scopes the nav to a client staff already walked away from.
    expect(getClientContext()).toBeNull();
    unmount();
    renderBar('/client-view/L1');
    expect(screen.getByRole('link', { name: /apply/i })).toHaveAttribute('href', '/apply');
  });

  test('picks up a client stashed after this render, on the next navigation', () => {
    renderBar('/applications');
    expect(screen.queryByText(/working with/i)).not.toBeInTheDocument();

    // ClientView writes the stash only after its fetch resolves — later than the TopBar render for
    // that same navigation. Reading it once at mount would leave the bar permanently blind.
    setClientContext({ borrowerId: 'B7', loanId: 'L1', name: 'Jane Doe' });
    fireEvent.click(screen.getByRole('link', { name: /apply/i }));

    expect(screen.getByText(/working with jane doe/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /applications/i })).toHaveAttribute(
      'href', '/client/B7/applications',
    );
  });

  test('with no client in context the nav is unchanged', () => {
    renderBar('/applications');

    expect(screen.getByRole('link', { name: /apply/i })).toHaveAttribute('href', '/apply');
    expect(screen.getByRole('link', { name: /applications/i })).toHaveAttribute(
      'href', '/applications',
    );
  });
});

describe('detectActive', () => {
  test.each([
    ['/apply', 'apply'],
    ['/apply?loan=L1', 'apply'],
    ['/client/B7/applications/new', 'apply'],
    ['/applications', 'applications'],
    ['/applications/12', 'applications'],
    ['/loan/12', 'applications'],
    ['/client/B7/applications', 'applications'],
    ['/admin', 'admin'],
    ['/dashboard', null],
  ])('%s → %s', (pathname, expected) => {
    expect(detectActive(pathname)).toBe(expected);
  });
});
