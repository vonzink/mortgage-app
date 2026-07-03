import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationsCard from './NotificationsCard';
import mortgageService from '../../../services/mortgageService';

jest.mock('../../../services/mortgageService', () => ({
  __esModule: true,
  default: { putNotificationPrefs: jest.fn() },
}));

const PREFS = {
  conditionUpdatesEnabled: true,
  conditionUpdatesChannel: 'EMAIL',
  statusChangesEnabled: true,
  statusChangesChannel: 'SMS',
  keyDatesEnabled: true,
  keyDatesChannel: 'EMAIL',
};

beforeEach(() => {
  mortgageService.putNotificationPrefs.mockReset();
});

describe('NotificationsCard', () => {
  test('renders the three preference rows', () => {
    render(<NotificationsCard prefs={PREFS} suiteLoanId="L1" />);
    expect(screen.getByText('Condition updates')).toBeInTheDocument();
    expect(screen.getByText('Status changes')).toBeInTheDocument();
    expect(screen.getByText('Key-date reminders')).toBeInTheDocument();
  });

  test('toggling Condition updates off PUTs the full six-field body with the change', async () => {
    mortgageService.putNotificationPrefs.mockResolvedValue({});
    render(<NotificationsCard prefs={PREFS} suiteLoanId="L1" />);
    fireEvent.click(screen.getByRole('button', { name: /toggle condition updates/i }));
    await waitFor(() => expect(mortgageService.putNotificationPrefs).toHaveBeenCalledTimes(1));
    expect(mortgageService.putNotificationPrefs).toHaveBeenCalledWith('L1', {
      conditionUpdatesEnabled: false,
      conditionUpdatesChannel: 'EMAIL',
      statusChangesEnabled: true,
      statusChangesChannel: 'SMS',
      keyDatesEnabled: true,
      keyDatesChannel: 'EMAIL',
    });
  });

  test('switching a channel to SMS PUTs that channel', async () => {
    mortgageService.putNotificationPrefs.mockResolvedValue({});
    render(<NotificationsCard prefs={PREFS} suiteLoanId="L1" />);
    // condition updates SMS chip
    const smsChips = screen.getAllByRole('button', { name: /sms/i });
    fireEvent.click(smsChips[0]); // first row (condition updates)
    await waitFor(() => expect(mortgageService.putNotificationPrefs).toHaveBeenCalledTimes(1));
    expect(mortgageService.putNotificationPrefs).toHaveBeenCalledWith(
      'L1',
      expect.objectContaining({ conditionUpdatesChannel: 'SMS' }),
    );
  });

  test('optimistic update reflects immediately, then persists', async () => {
    mortgageService.putNotificationPrefs.mockResolvedValue({});
    const { container } = render(<NotificationsCard prefs={PREFS} suiteLoanId="L1" />);
    const toggle = screen.getByRole('button', { name: /toggle condition updates/i });
    expect(toggle.classList.contains('is-on')).toBe(true);
    fireEvent.click(toggle);
    // optimistic: flips before the promise resolves
    expect(toggle.classList.contains('is-on')).toBe(false);
    await waitFor(() => expect(mortgageService.putNotificationPrefs).toHaveBeenCalled());
    expect(container).toBeTruthy();
  });

  test('on a rejected save the toggle reverts and an error is shown', async () => {
    mortgageService.putNotificationPrefs.mockRejectedValue(new Error('nope'));
    render(<NotificationsCard prefs={PREFS} suiteLoanId="L1" />);
    const toggle = screen.getByRole('button', { name: /toggle condition updates/i });
    expect(toggle.classList.contains('is-on')).toBe(true);
    fireEvent.click(toggle);
    // optimistic off
    expect(toggle.classList.contains('is-on')).toBe(false);
    // reverts back on after the rejection
    await waitFor(() => expect(toggle.classList.contains('is-on')).toBe(true));
    expect(screen.getByText(/couldn't save/i)).toBeInTheDocument();
  });

  test('calls onSaved after a successful save', async () => {
    mortgageService.putNotificationPrefs.mockResolvedValue({});
    const onSaved = jest.fn();
    render(<NotificationsCard prefs={PREFS} suiteLoanId="L1" onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('button', { name: /toggle status changes/i }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});
