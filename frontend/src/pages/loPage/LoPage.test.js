/**
 * Public /lo/:slug LO vanity landing page — Task 14.
 *
 * A prospect lands on /lo/zack-zink (NO auth): the LO's public card renders
 * (displayName / title / NMLS / phone / email / photo-or-initials) and
 * "Start your application" stashes the slug in sessionStorage (for intake
 * attribution) before routing to signup (cold visitor) or /apply (signed in).
 * Unknown/disabled slug (service → null) replace-navigates home.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoPage from './LoPage';
import mortgageService from '../../services/mortgageService';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mutable box so each test can flip authenticated state (LandingPage pattern).
let mockAuth = { isAuthenticated: false };
jest.mock('react-oidc-context', () => ({ useAuth: () => mockAuth }));

jest.mock('../../services/mortgageService');

const LO = {
  slug: 'zack-zink',
  displayName: 'Zack Zink',
  title: 'Senior Loan Officer',
  nmlsId: '123456',
  phone: '3035551234',
  email: 'zack@msfgco.com',
  photoUrl: null,
};

function renderLoPage(slug = 'zack-zink') {
  return render(
    <MemoryRouter initialEntries={[`/lo/${slug}`]}>
      <Routes>
        <Route path="/lo/:slug" element={<LoPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
  jest.clearAllMocks();
  mockAuth = { isAuthenticated: false };
  mortgageService.getPublicLoPage = jest.fn().mockResolvedValue(LO);
});

it('renders the LO card: name, title, NMLS, phone and email links', async () => {
  renderLoPage();
  expect(await screen.findByRole('heading', { name: 'Zack Zink' })).toBeInTheDocument();
  expect(mortgageService.getPublicLoPage).toHaveBeenCalledWith('zack-zink');
  expect(screen.getByText(/Senior Loan Officer/)).toBeInTheDocument();
  expect(screen.getByText(/NMLS #123456/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /3035551234/ })).toHaveAttribute('href', 'tel:3035551234');
  expect(screen.getByRole('link', { name: /zack@msfgco.com/ })).toHaveAttribute(
    'href', 'mailto:zack@msfgco.com',
  );
});

it('no photoUrl → initials avatar (no <img>)', async () => {
  renderLoPage();
  await screen.findByRole('heading', { name: 'Zack Zink' });
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.getByText('ZZ')).toBeInTheDocument();
});

it('photoUrl present → renders the photo', async () => {
  mortgageService.getPublicLoPage.mockResolvedValue({ ...LO, photoUrl: 'https://x/p.jpg' });
  renderLoPage();
  await screen.findByRole('heading', { name: 'Zack Zink' });
  expect(screen.getByRole('img', { name: /Zack Zink/ })).toHaveAttribute('src', 'https://x/p.jpg');
});

it('unknown slug (service null) → replace-navigates home', async () => {
  mortgageService.getPublicLoPage.mockResolvedValue(null);
  renderLoPage('nobody');
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }));
});

it('Start (unauthenticated) stashes the normalized slug and goes to /signup', async () => {
  renderLoPage();
  fireEvent.click(await screen.findByRole('button', { name: /start your application/i }));
  expect(sessionStorage.getItem('loSlug')).toBe('zack-zink');
  expect(mockNavigate).toHaveBeenCalledWith('/signup');
});

it('Start (authenticated) stashes the slug and goes straight to /apply', async () => {
  mockAuth = { isAuthenticated: true };
  renderLoPage();
  fireEvent.click(await screen.findByRole('button', { name: /start your application/i }));
  expect(sessionStorage.getItem('loSlug')).toBe('zack-zink');
  expect(mockNavigate).toHaveBeenCalledWith('/apply');
});

it('stashes the slug lowercased+trimmed (URL case-forgiveness)', async () => {
  renderLoPage('Zack-Zink');
  fireEvent.click(await screen.findByRole('button', { name: /start your application/i }));
  expect(sessionStorage.getItem('loSlug')).toBe('zack-zink');
});
