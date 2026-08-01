import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopBar, { detectActive } from './TopBar';
import {
  setClientContext, clearClientContext, getClientContext,
} from '../../pages/clientView/clientContext';

let mockAuth = { isLoading: false, isAuthenticated: false, user: null, removeUser: jest.fn() };
jest.mock('react-oidc-context', () => ({ useAuth: () => mockAuth }));

// A hash URL keeps the sign-out redirect from tripping jsdom's "navigation not implemented".
jest.mock('../../auth/cognitoConfig', () => ({ buildCognitoLogoutUrl: () => '#signed-out' }));

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
  mockAuth = { isLoading: false, isAuthenticated: false, user: null, removeUser: jest.fn() };
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

  test('scopes the nav as soon as a client is stashed, with no navigation at all', () => {
    // The real entry point: an LO hard-loads /client-view/L1 from the suite console. ClientView
    // stashes the client only when its fetch resolves — no route change, no remount. If the bar
    // waited for a navigation, the LO's first Applications click would land on the global list,
    // which is precisely the behavior this feature removes.
    renderBar('/client-view/L1');
    expect(screen.queryByText(/working with/i)).not.toBeInTheDocument();

    act(() => {
      setClientContext({ borrowerId: 'B7', loanId: 'L1', name: 'Jane Doe' });
    });

    expect(screen.getByText(/working with jane doe/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /applications/i })).toHaveAttribute(
      'href', '/client/B7/applications',
    );
    expect(screen.getByRole('link', { name: /apply/i })).toHaveAttribute(
      'href', '/client/B7/applications/new',
    );
  });

  test('a borrower never gets a client-scoped nav, stash or not', () => {
    // A leftover stash in a shared tab would otherwise put another person's name in the borrower's
    // own header and point their Apply button at a staff route that just bounces them home.
    mockRoles = { isAdmin: false, isStaff: false };
    setClientContext({ borrowerId: 'B7', loanId: 'L1', name: 'Jane Doe' });
    renderBar('/dashboard');

    expect(screen.queryByText(/working with/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /apply/i })).toHaveAttribute('href', '/apply');
    expect(screen.getByRole('link', { name: /applications/i })).toHaveAttribute(
      'href', '/applications',
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

test('signing out drops the client scope along with the session', async () => {
  // sessionStorage survives the Cognito round trip, so without this the next person to sign in on
  // this tab inherits the previous LO's client.
  mockAuth = {
    isLoading: false,
    isAuthenticated: true,
    user: { profile: { name: 'Sam Officer' } },
    removeUser: jest.fn().mockResolvedValue(undefined),
  };
  setClientContext({ borrowerId: 'B7', loanId: 'L1', name: 'Jane Doe' });
  renderBar('/client-view/L1');

  fireEvent.click(screen.getByRole('button', { name: /settings/i }));
  fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

  await waitFor(() => expect(getClientContext()).toBeNull());
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
