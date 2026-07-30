import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopBar, { detectActive } from './TopBar';
import { setClientContext, clearClientContext } from '../../pages/clientView/clientContext';

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
