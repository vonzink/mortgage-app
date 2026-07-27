import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

jest.mock('../../services/mortgageService', () => ({
  __esModule: true,
  default: {
    getApplications: jest.fn(),
    getBorrowerDashboard: jest.fn(),
    putNotificationPrefs: jest.fn(),
  },
}));

import mortgageService from '../../services/mortgageService';
import LoanStatusCenter from './LoanStatusCenter';

const ACTIVE_LOAN = {
  id: 'suite-1',
  applicationNumber: '1000000042',
  status: 'IN_UNDERWRITING',
  city: 'Aurora',
  state: 'CO',
  statusChangedAt: '2026-06-29T12:00:00Z',
};
const PAST_LOAN = {
  id: 'suite-2',
  applicationNumber: '1000000007',
  status: 'FUNDED',
  city: 'Lehi',
  state: 'UT',
  statusChangedAt: '2026-05-01T12:00:00Z',
};

const DASHBOARD = {
  status: 'IN_UNDERWRITING',
  property: { addressLine1: '123 Main St', city: 'Aurora', state: 'CO' },
};

// A payload with EVERY section non-null (nothing hidden by the LO). visibility{}
// is always present; showAppraisal gates the appraisal card.
const FULL_DASHBOARD = {
  status: 'IN_UNDERWRITING',
  property: {
    addressLine1: '123 Main St', city: 'Aurora', state: 'CO',
    photoUrl: 'https://s3.example.com/prop-photo.jpg?X-Amz-Signature=abc',
    vesting: 'John Q. Public and Jane Q. Public, as joint tenants',
  },
  // v2.1: the 8 pipeline Kanban lanes in board order (key = KanbanLane.name(),
  // label = lane label()); CURRENT matches this fixture's IN_UNDERWRITING status.
  milestones: [
    { key: 'PRE_APPROVAL', label: 'Pre-Approval', state: 'DONE', date: '2026-04-20' },
    { key: 'APPLICATION', label: 'Application', state: 'DONE', date: '2026-05-01' },
    { key: 'PROCESSING', label: 'Processing', state: 'DONE', date: '2026-05-20' },
    { key: 'UNDERWRITING', label: 'Underwriting', state: 'CURRENT', date: null },
    { key: 'CONDITIONAL_APPROVAL', label: 'Conditional Approval', state: 'UPCOMING', date: null },
    { key: 'CLEAR_TO_CLOSE', label: 'Clear to Close', state: 'UPCOMING', date: null },
    { key: 'CLOSED', label: 'Closed', state: 'UPCOMING', date: null },
    { key: 'FUNDED', label: 'Funded', state: 'UPCOMING', date: null },
  ],
  conditions: {
    outstandingCount: 1,
    items: [
      { id: 'c1', status: 'REQUESTED', conditionText: '2025 W-2 — all employers', dueDate: '2026-07-08' },
      { id: 'c2', status: 'CLEARED', conditionText: 'Purchase contract', dueDate: null, clearedAt: '2026-07-14T16:00:00Z' },
    ],
  },
  documents: {
    uploads: [
      { id: 'u1', fileName: 'paystubs_june.pdf', documentType: 'INCOME', status: 'CLEARED', uploadedAt: '2026-06-10T00:00:00Z', fromLoanTeam: false },
    ],
    fromTeam: [
      { id: 't1', fileName: 'loan_estimate.pdf', documentType: 'LOAN_ESTIMATE', status: 'CLEARED', uploadedAt: '2026-06-05T00:00:00Z', fromLoanTeam: true },
    ],
  },
  keyDates: [
    { key: 'APPRAISAL_INSPECTED', label: 'Appraisal inspection', date: '2026-07-14', urgent: false },
    { key: 'RATE_LOCK_EXPIRES', label: 'Rate lock expires', date: '2026-07-19', urgent: true },
  ],
  // expiresAt must stay in the FUTURE at run time or RateLockCard renders its
  // "Lock expired" branch (the original hardcoded 2026-07-19 was a time bomb).
  rateLock: {
    status: 'LOCKED', noteRate: 5.99, lockedAt: '2026-06-19',
    expiresAt: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10),
    lockDays: 30,
  },
  loanSnapshot: {
    program: 'Conventional', noteRate: 5.99, purchasePrice: 500000, baseLoanAmount: 400000,
    totalLoanAmount: 404000, financedFeesAmount: 4000, cashToClose: 25000,
  },
  payment: {
    principalAndInterest: 2100, taxes: 400, hazardInsurance: 120,
    mortgageInsurance: 0, hoa: 0, total: 2620,
  },
  loanOfficer: { name: 'Dana Lender', title: 'Senior LO', nmls: '123456', phone: '555-1212', email: 'dana@example.com' },
  notificationPrefs: {
    conditionUpdatesEnabled: true, conditionUpdatesChannel: 'EMAIL',
    statusChangesEnabled: true, statusChangesChannel: 'EMAIL',
    keyDatesEnabled: true, keyDatesChannel: 'BOTH',
  },
  contacts: [
    { role: 'TITLE_COMPANY', roleLabel: 'Title', name: 'Terri Cruz', company: 'Alta Title Co.', phone: '(303) 555-0140', email: 'terri@altatitle.example.com' },
    { role: 'INSURANCE_AGENT', roleLabel: 'Insurance', name: 'Ian Shore', company: 'Acme Insurance', phone: '(303) 555-0177', email: 'ian@acmeins.example.com' },
  ],
  closingCosts: {
    origination: 3000, services: 2500, taxesAndGov: 1200, prepaidsAndEscrow: 1800, other: 400,
    totalClosingCosts: 8900, sellerCredits: 5000, otherCredits: 250, estimatedCashToClose: 25000,
  },
  visibility: {
    showMilestones: true, showConditions: true, showDocuments: true, showDownloads: true,
    showKeyDates: true, showAppraisal: true, showRateLock: true, showLoanSnapshot: true,
    showPayment: true, showClosingCosts: true, showLoanOfficer: true, showContacts: true,
    showNotifications: true,
  },
};

// v2.1 multi-photo contract: ordered presigned GETs, no null elements
// (the server skips failed presigns); property.photoUrl = first element.
const PHOTOS = [
  'https://s3.example.com/prop-photo.jpg?X-Amz-Signature=abc',
  'https://s3.example.com/prop-back.jpg?X-Amz-Signature=def',
  'https://s3.example.com/prop-kitchen.jpg?X-Amz-Signature=ghi',
];

function renderPage(initialEntry = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/dashboard" element={<LoanStatusCenter />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mortgageService.getApplications.mockResolvedValue({ content: [ACTIVE_LOAN] });
  mortgageService.getBorrowerDashboard.mockResolvedValue(DASHBOARD);
});

describe('LoanStatusCenter', () => {
  test('with ONE loan: no selector, dashboard fetched for its id, hero renders address', async () => {
    renderPage();

    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard).toHaveBeenCalledWith('suite-1'),
    );
    expect(await screen.findByText(/123 Main St/)).toBeInTheDocument();
    // With a single loan there is no picker (the <select> combobox).
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /loan status center/i })).toBeInTheDocument();
  });

  test('explicit loanId prop: fetches that loan directly and does NOT call /me/loans', async () => {
    render(
      <MemoryRouter initialEntries={['/client-view/LX']}>
        <LoanStatusCenter loanId="LX" />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard).toHaveBeenCalledWith('LX'),
    );
    expect(mortgageService.getApplications).not.toHaveBeenCalled();
    // No loan switcher in explicit mode.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  test('with TWO loans: selector rendered, defaults to the active loan', async () => {
    mortgageService.getApplications.mockResolvedValue({ content: [PAST_LOAN, ACTIVE_LOAN] });

    renderPage();

    expect(await screen.findByRole('combobox')).toBeInTheDocument();
    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard).toHaveBeenCalledWith('suite-1'),
    );
  });

  test('?loan= param wins over the default selection', async () => {
    mortgageService.getApplications.mockResolvedValue({ content: [ACTIVE_LOAN, PAST_LOAN] });

    renderPage('/dashboard?loan=suite-2');

    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard).toHaveBeenCalledWith('suite-2'),
    );
    expect(mortgageService.getBorrowerDashboard).not.toHaveBeenCalledWith('suite-1');
  });

  test('picking a loan in the selector re-fetches the dashboard for it', async () => {
    mortgageService.getApplications.mockResolvedValue({ content: [ACTIVE_LOAN, PAST_LOAN] });

    renderPage();
    const select = await screen.findByRole('combobox');
    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard).toHaveBeenCalledWith('suite-1'),
    );

    fireEvent.change(select, { target: { value: 'suite-2' } });
    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard).toHaveBeenCalledWith('suite-2'),
    );
  });

  test('error state renders a dismissable banner with retry', async () => {
    // getBorrowerDashboard resolves null on failure (the service swallows errors).
    mortgageService.getBorrowerDashboard.mockResolvedValue(null);

    renderPage();

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent(/couldn.t load/i);

    // Retry re-fetches; a success clears the banner.
    mortgageService.getBorrowerDashboard.mockResolvedValue(DASHBOARD);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  test('grid skeleton columns render after load', async () => {
    const { container } = renderPage();
    await screen.findByText(/123 Main St/);
    expect(container.querySelector('.lsc-grid')).toBeInTheDocument();
    expect(container.querySelector('.lsc-rail-col')).toBeInTheDocument();
    expect(container.querySelector('.lsc-main-col')).toBeInTheDocument();
    expect(container.querySelector('.lsc-side-col')).toBeInTheDocument();
  });

  test('full payload: a representative element from every column renders', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    const { container } = renderPage();

    // Left rail — a milestone label.
    expect(await screen.findByText('Underwriting')).toBeInTheDocument();
    // Main — the to-do condition, the upload dropzone, a download button.
    expect(screen.getByText('2025 W-2 — all employers')).toBeInTheDocument();
    expect(screen.getByText(/Drop your documents here/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Download$/i })).toBeInTheDocument();
    // Side — the rate-lock card, the payment total. (LO card now lives in the left rail.)
    // (5.990% renders in both the rate-lock and snapshot cards, hence getAllByText.)
    expect(screen.getByText('Rate lock active')).toBeInTheDocument();
    expect(screen.getAllByText(/5\.990%/).length).toBeGreaterThan(0);
    expect(screen.getByText('Dana Lender')).toBeInTheDocument();
    expect(screen.getByText('Estimated monthly payment')).toBeInTheDocument();
    // Total row renders value + " / mo" suffix in one node.
    expect(screen.getByText(/\$2,620\.00\s*\/\s*mo/)).toBeInTheDocument();
    // Snapshot card renders the (newly API-wired) cash-to-close slot. Scoped to
    // the .lsc-kv row: ClosingCostsCard (Task 7) renders the same figure — the
    // server sends one DoT cashFromToBorrower value to both slots.
    const cashRow = screen.getByText('Est. cash to close').closest('.lsc-kv');
    expect(cashRow).toHaveTextContent('$25,000.00');
    // Appraisal card is gated by visibility.showAppraisal.
    expect(container.querySelector('.lsc-side-col')).toHaveTextContent(/Appraisal/i);
  });

  test('milestone rail renders all 8 pipeline lanes in board order', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    const labels = [...container.querySelectorAll('.lsc-rail .lsc-rl-label')].map((el) => el.textContent);
    expect(labels).toEqual([
      'Pre-Approval', 'Application', 'Processing', 'Underwriting',
      'Conditional Approval', 'Clear to Close', 'Closed', 'Funded',
    ]);
    expect(container.querySelector('.lsc-rl.current .lsc-rl-label')).toHaveTextContent('Underwriting');
  });

  test('Document history card no longer renders, even with uploads present', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    renderPage();

    // Wait for the grid, then assert the removed card is gone while the other
    // two documents.uploads consumers (dropzone) and downloads still render.
    expect(await screen.findByText(/Drop your documents here/i)).toBeInTheDocument();
    expect(screen.queryByText(/document history/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Download$/i })).toBeInTheDocument();
  });

  test('property.photoUrl renders the hero photo banner layer', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    const { container } = renderPage();
    await screen.findByText('Underwriting');

    const hero = container.querySelector('.lsc-hero');
    expect(hero.classList.contains('lsc-hero--photo')).toBe(true);
    const photo = container.querySelector('.lsc-hero-photo');
    expect(photo).not.toBeNull();
    expect(hero.firstElementChild).toBe(photo);
    expect(photo.getAttribute('style')).toContain('prop-photo.jpg');
    expect(photo).toHaveAttribute('aria-hidden', 'true');
  });

  test('no property.photoUrl → flat forest hero, no photo layer', async () => {
    // Default DASHBOARD fixture has no photoUrl.
    const { container } = renderPage();
    await screen.findByText(/123 Main St/);

    const hero = container.querySelector('.lsc-hero');
    expect(hero.classList.contains('lsc-hero--photo')).toBe(false);
    expect(container.querySelector('.lsc-hero-photo')).toBeNull();
  });

  test('photoUrls with >1 entries renders the thumbnail strip; hero shows the first photo', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      property: { ...FULL_DASHBOARD.property, photoUrls: PHOTOS },
    });
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    const thumbs = screen.getAllByRole('button', { name: /show photo \d of 3/i });
    expect(thumbs).toHaveLength(3);
    expect(thumbs[0].className).toContain('is-active');
    expect(thumbs[0]).toHaveAttribute('aria-pressed', 'true');
    expect(thumbs[1]).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('.lsc-hero-photo').getAttribute('style')).toContain('prop-photo.jpg');
  });

  test('clicking a thumbnail swaps it into the hero (client-side only, no refetch)', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      property: { ...FULL_DASHBOARD.property, photoUrls: PHOTOS },
    });
    const { container } = renderPage();
    await screen.findByText('Dana Lender');
    const callsBefore = mortgageService.getBorrowerDashboard.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: /show photo 2 of 3/i }));

    expect(container.querySelector('.lsc-hero-photo').getAttribute('style')).toContain('prop-back.jpg');
    const thumbs = screen.getAllByRole('button', { name: /show photo \d of 3/i });
    expect(thumbs[1].className).toContain('is-active');
    expect(thumbs[0].className).not.toContain('is-active');
    expect(mortgageService.getBorrowerDashboard.mock.calls.length).toBe(callsBefore);
  });

  test('photoUrls-only payload with ONE photo: hero renders, no strip', async () => {
    // No legacy photoUrl at all — pins the new derivation, not the v2 fallback.
    const propNoLegacy = { ...FULL_DASHBOARD.property, photoUrls: [PHOTOS[0]] };
    delete propNoLegacy.photoUrl;
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      property: propNoLegacy,
    });
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    expect(container.querySelector('.lsc-photo-strip')).toBeNull();
    const hero = container.querySelector('.lsc-hero');
    expect(hero.classList.contains('lsc-hero--photo')).toBe(true);
    expect(container.querySelector('.lsc-hero-photo').getAttribute('style')).toContain('prop-photo.jpg');
  });

  test('no photoUrls: legacy property.photoUrl still drives the hero, no strip (back-compat)', async () => {
    // FULL_DASHBOARD.property has photoUrl but NO photoUrls — the pre-v2.1 shape.
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    expect(container.querySelector('.lsc-photo-strip')).toBeNull();
    expect(container.querySelector('.lsc-hero-photo').getAttribute('style')).toContain('prop-photo.jpg');
  });

  test('switching loans resets the hero to the new loan\'s first photo', async () => {
    mortgageService.getApplications.mockResolvedValue({ content: [ACTIVE_LOAN, PAST_LOAN] });
    mortgageService.getBorrowerDashboard.mockImplementation(async (id) => (
      id === 'suite-1'
        ? { ...FULL_DASHBOARD, property: { ...FULL_DASHBOARD.property, photoUrls: PHOTOS } }
        : { ...FULL_DASHBOARD, property: { ...FULL_DASHBOARD.property, photoUrls: [PHOTOS[2], PHOTOS[1]] } }
    ));
    const { container } = renderPage();
    const select = await screen.findByRole('combobox');
    await screen.findByText('Dana Lender');

    fireEvent.click(screen.getByRole('button', { name: /show photo 2 of 3/i }));
    expect(container.querySelector('.lsc-hero-photo').getAttribute('style')).toContain('prop-back.jpg');

    fireEvent.change(select, { target: { value: 'suite-2' } });
    await waitFor(() =>
      expect(container.querySelector('.lsc-hero-photo').getAttribute('style')).toContain('prop-kitchen.jpg'),
    );
    expect(screen.getAllByRole('button', { name: /show photo \d of 2/i })[0].className).toContain('is-active');
  });

  test('a background refetch on the SAME loan PRESERVES the selected hero photo', async () => {
    // Regression: the payload effect used to setHeroIdx(0) on every fetch, so a
    // retryTick bump (NotificationsCard onSaved / UploadDropzone onUploaded) yanked
    // the borrower back to photo #1. Reset now only fires on a loan change.
    mortgageService.putNotificationPrefs.mockResolvedValue({});
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      property: { ...FULL_DASHBOARD.property, photoUrls: PHOTOS },
    });
    const { container } = renderPage();
    await screen.findByText('Dana Lender');
    const callsBefore = mortgageService.getBorrowerDashboard.mock.calls.length;

    // Borrower picks the 2nd photo.
    fireEvent.click(screen.getByRole('button', { name: /show photo 2 of 3/i }));
    expect(container.querySelector('.lsc-hero-photo').getAttribute('style')).toContain('prop-back.jpg');

    // Toggling a notification pref fires onSaved → refetch (retryTick bump) for the
    // SAME loan — a background refresh, not a loan switch.
    fireEvent.click(screen.getByRole('button', { name: /toggle condition updates/i }));
    await waitFor(() =>
      expect(mortgageService.getBorrowerDashboard.mock.calls.length).toBe(callsBefore + 1),
    );

    // Hero still shows the borrower's chosen photo — NOT reset to photo #1.
    expect(container.querySelector('.lsc-hero-photo').getAttribute('style')).toContain('prop-back.jpg');
    const thumbs = screen.getAllByRole('button', { name: /show photo \d of 3/i });
    expect(thumbs[1].className).toContain('is-active');
    expect(thumbs[0].className).not.toContain('is-active');
  });

  test('property.vesting renders under the address line', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    const { container } = renderPage();
    await screen.findByText('Underwriting');

    const vest = container.querySelector('.lsc-vesting');
    expect(vest).not.toBeNull();
    expect(vest).toHaveTextContent('John Q. Public and Jane Q. Public, as joint tenants');
    // It sits inside the hero text block, after the address sub-line.
    expect(vest.closest('.lsc-hero-text')).not.toBeNull();
  });

  test('no property.vesting → no vesting line', async () => {
    // Default DASHBOARD fixture has no vesting.
    const { container } = renderPage();
    await screen.findByText(/123 Main St/);
    expect(container.querySelector('.lsc-vesting')).toBeNull();
  });

  test('whitespace-only property.vesting → no vesting line', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      property: { ...FULL_DASHBOARD.property, vesting: '   ' },
    });
    const { container } = renderPage();
    await screen.findByText('Underwriting');
    expect(container.querySelector('.lsc-vesting')).toBeNull();
  });

  test('single "Your loan team" card renders in the rail below the LO card; closing costs unchanged', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    // ONE consolidated card holds both contacts…
    const rail = container.querySelector('.lsc-rail-col');
    expect(rail.querySelectorAll('.lsc-contact')).toHaveLength(1);
    expect(rail).toHaveTextContent('Terri Cruz');
    expect(rail).toHaveTextContent('Alta Title Co.');
    expect(rail).toHaveTextContent('Ian Shore');
    // …with roleLabel eyebrows, not per-contact card headings.
    const railHeadings = [...rail.querySelectorAll('.lsc-card-h h3')].map((h) => h.textContent);
    expect(railHeadings).toEqual(
      expect.arrayContaining(['Your loan officer', 'Your loan team', 'Notifications'])
    );
    expect(railHeadings).not.toEqual(expect.arrayContaining(['Title']));
    expect(railHeadings.indexOf('Your loan officer')).toBeLessThan(railHeadings.indexOf('Your loan team'));
    expect(railHeadings.indexOf('Your loan team')).toBeLessThan(railHeadings.indexOf('Notifications'));

    // Closing costs unchanged: side column, after the payment card.
    const side = container.querySelector('.lsc-side-col');
    expect(side).toHaveTextContent('Closing costs');
    expect(side).toHaveTextContent('$8,900.00');
    const sideHeadings = [...side.querySelectorAll('.lsc-card-h h3')].map((h) => h.textContent);
    expect(sideHeadings.indexOf('Estimated monthly payment')).toBeLessThan(sideHeadings.indexOf('Closing costs'));
  });

  test('payload.layout reorders sections within each column', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      layout: {
        rail: ['notifications', 'contacts', 'loanOfficer', 'milestones'],
        main: ['downloads', 'cleared', 'dropzone', 'todo'],
        side: ['closingCosts', 'payment', 'snapshot', 'appraisal', 'keyDates', 'rateLock'],
      },
    });
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    const rail = [...container.querySelector('.lsc-rail-col').children];
    expect(rail[0].querySelector('h3')).toHaveTextContent('Notifications');
    expect(rail[1].querySelector('h3')).toHaveTextContent('Your loan team');
    expect(rail[2].querySelector('h3')).toHaveTextContent('Your loan officer');
    expect(rail[3].classList.contains('lsc-rail')).toBe(true); // StatusRail <ol> last

    const main = [...container.querySelector('.lsc-main-col').children];
    expect(main[0].querySelector('h3')).toHaveTextContent('Downloads');
    expect(main[1].querySelector('h3')).toHaveTextContent('Cleared items');
    expect(main[2]).toHaveTextContent('Drop your documents here'); // dropzone wrapper div
    expect(main[3].querySelector('h3')).toHaveTextContent('Your to-do list');

    const side = [...container.querySelector('.lsc-side-col').children];
    expect(side[0].querySelector('h3')).toHaveTextContent('Closing costs');
    expect(side[1].querySelector('h3')).toHaveTextContent('Estimated monthly payment');
    expect(side[2].querySelector('h3')).toHaveTextContent('Your loan at a glance');
    expect(side[3].querySelector('h3')).toHaveTextContent('Appraisal');
    expect(side[4].querySelector('h3')).toHaveTextContent('Key dates');
    expect(side[5].classList.contains('lsc-lockcard')).toBe(true); // RateLockCard (headerless)
  });

  test('layout: unknown keys are ignored and missing keys append in default order', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      layout: {
        rail: ['contacts', 'somethingNew'], // partial + unknown key
        main: ['downloads'],                // partial
        // side absent entirely → default side order
      },
    });
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    const rail = [...container.querySelector('.lsc-rail-col').children];
    expect(rail[0].querySelector('h3')).toHaveTextContent('Your loan team');
    expect(rail[1].classList.contains('lsc-rail')).toBe(true); // milestones appended first…
    expect(rail[2].querySelector('h3')).toHaveTextContent('Your loan officer');
    expect(rail[3].querySelector('h3')).toHaveTextContent('Notifications');

    const main = [...container.querySelector('.lsc-main-col').children];
    expect(main[0].querySelector('h3')).toHaveTextContent('Downloads');
    expect(main[1].querySelector('h3')).toHaveTextContent('Your to-do list');
    expect(main[2]).toHaveTextContent('Drop your documents here');
    expect(main[3].querySelector('h3')).toHaveTextContent('Cleared items');

    const side = [...container.querySelector('.lsc-side-col').children];
    expect(side[0].classList.contains('lsc-lockcard')).toBe(true); // default order intact
    expect(side[side.length - 1].querySelector('h3')).toHaveTextContent('Closing costs');
  });

  test('a section listed in the layout but hidden by the LO still renders nothing', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      contacts: null, // LO hid the loan-team card
      layout: { rail: ['contacts', 'loanOfficer', 'milestones', 'notifications'] },
    });
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    expect(screen.queryByText('Your loan team')).not.toBeInTheDocument();
    // loanOfficer leads the rail — the hidden contacts key contributed nothing.
    const rail = [...container.querySelector('.lsc-rail-col').children];
    expect(rail[0].querySelector('h3')).toHaveTextContent('Your loan officer');
  });

  test('cross-column placement: a key dragged to another column renders there', async () => {
    // Union contract: the console can drag any section across columns; the
    // API plan's ITs park rateLock in rail and expect 200 — the borrower app
    // must honor the persisted placement, not snap it back to its home column.
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      layout: {
        rail: ['rateLock', 'milestones', 'loanOfficer', 'contacts', 'notifications'],
        main: ['todo', 'dropzone', 'cleared', 'downloads'],
        side: ['keyDates', 'appraisal', 'snapshot', 'payment', 'closingCosts'],
      },
    });
    const { container } = renderPage();
    await screen.findByText('Dana Lender');

    // RateLockCard now leads the RAIL — and is gone from the side column.
    const rail = container.querySelector('.lsc-rail-col');
    expect(rail.firstElementChild.classList.contains('lsc-lockcard')).toBe(true);
    expect(container.querySelector('.lsc-side-col .lsc-lockcard')).toBeNull();

    // The side column renders its remaining sections, in order, without rateLock.
    const sideHeadings = [...container.querySelectorAll('.lsc-side-col .lsc-card-h h3')].map((h) => h.textContent);
    expect(sideHeadings).toEqual([
      'Key dates', 'Appraisal', 'Your loan at a glance', 'Estimated monthly payment', 'Closing costs',
    ]);
  });

  test('LO-hid contract: contacts/closingCosts null (or contacts empty) render nothing', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      contacts: null,
      closingCosts: null,
    });
    renderPage();

    expect(await screen.findByText('Underwriting')).toBeInTheDocument();
    expect(screen.queryByText('Terri Cruz')).not.toBeInTheDocument();
    expect(screen.queryByText('Closing costs')).not.toBeInTheDocument();
    // The rest of the grid is intact.
    expect(screen.getByText('Dana Lender')).toBeInTheDocument();
    expect(screen.getByText('Estimated monthly payment')).toBeInTheDocument();
  });

  test('empty contacts array renders no loan-team card', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      contacts: [],
    });
    renderPage();

    expect(await screen.findByText('Underwriting')).toBeInTheDocument();
    expect(screen.queryByText('Terri Cruz')).not.toBeInTheDocument();
    expect(screen.queryByText('Your loan team')).not.toBeInTheDocument();
    expect(screen.getByText('Your loan officer')).toBeInTheDocument();
  });

  test('LO-hidden sections (rateLock/payment/loanOfficer null) render nothing while the rest stay', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      rateLock: null,
      payment: null,
      loanOfficer: null,
    });
    renderPage();

    // Visible sections still render (proves the rest of the grid is intact).
    expect(await screen.findByText('Underwriting')).toBeInTheDocument();
    expect(screen.getByText('2025 W-2 — all employers')).toBeInTheDocument();

    // Hidden sections are ABSENT (server-visibility contract flows to the UI).
    expect(screen.queryByText('Rate lock active')).not.toBeInTheDocument();
    expect(screen.queryByText('Estimated monthly payment')).not.toBeInTheDocument();
    expect(screen.queryByText('Your loan officer')).not.toBeInTheDocument();
    expect(screen.queryByText('Dana Lender')).not.toBeInTheDocument();
  });

  test('uploads hidden (showDocuments=false) but downloads shown: DownloadsCard renders, UploadDropzone does NOT', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue({
      ...FULL_DASHBOARD,
      documents: {
        uploads: null,
        fromTeam: [
          { id: 't1', fileName: 'Disclosure.pdf', documentType: 'DISCLOSURE', status: 'ACCEPTED', uploadedAt: '2026-07-01', fromLoanTeam: true },
        ],
      },
    });
    renderPage();

    // DownloadsCard is present — the download surface is shown.
    expect(await screen.findByRole('button', { name: /^Download$/i })).toBeInTheDocument();
    // The upload dropzone must NOT render — the upload surface was hidden by the LO,
    // even though `documents` itself is non-null (documents.uploads is null).
    expect(screen.queryByText(/Drop your documents here/i)).not.toBeInTheDocument();
  });

  test('Key dates "Open calendar" opens the modal; closing removes it', async () => {
    mortgageService.getBorrowerDashboard.mockResolvedValue(FULL_DASHBOARD);
    const { container } = renderPage();

    const openBtn = await screen.findByRole('button', { name: /open calendar/i });
    expect(container.querySelector('.lsc-modal-bg')).not.toBeInTheDocument();

    fireEvent.click(openBtn);
    expect(container.querySelector('.lsc-modal-bg')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() =>
      expect(container.querySelector('.lsc-modal-bg')).not.toBeInTheDocument(),
    );
  });

});
