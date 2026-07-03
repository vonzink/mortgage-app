import React, { useState } from 'react';

import mortgageService from '../../../services/mortgageService';

/*
 * NotificationsCard — the "Notifications" preferences card in the Loan Status
 * Center right column. Ported from the .np / .sw / .chip block of
 * docs/design/loan-status-center/MSFG Loan Status Center.html.
 *
 * Consumes payload.notificationPrefs:
 *   { conditionUpdatesEnabled, conditionUpdatesChannel,
 *     statusChangesEnabled,   statusChangesChannel,
 *     keyDatesEnabled,        keyDatesChannel }
 * channel ∈ "EMAIL" | "SMS".
 *
 * Editing anything applies OPTIMISTICALLY to local state, then PUTs the full
 * six-field body via mortgageService.putNotificationPrefs(suiteLoanId, body).
 * On rejection it reverts to the pre-edit state and shows an inline error (a
 * local notice — the card stays self-contained and testable rather than
 * depending on the app-level toast host).
 */

const ROWS = [
  { enabledKey: 'conditionUpdatesEnabled', channelKey: 'conditionUpdatesChannel', label: 'Condition updates', sub: 'New requests & cleared items' },
  { enabledKey: 'statusChangesEnabled', channelKey: 'statusChangesChannel', label: 'Status changes', sub: 'Milestone progress' },
  { enabledKey: 'keyDatesEnabled', channelKey: 'keyDatesChannel', label: 'Key-date reminders', sub: 'Rate lock, appraisal, closing' },
];

const DEFAULTS = {
  conditionUpdatesEnabled: false,
  conditionUpdatesChannel: 'EMAIL',
  statusChangesEnabled: false,
  statusChangesChannel: 'EMAIL',
  keyDatesEnabled: false,
  keyDatesChannel: 'EMAIL',
};

function normalize(prefs) {
  return { ...DEFAULTS, ...(prefs || {}) };
}

export default function NotificationsCard({ prefs, suiteLoanId, onSaved }) {
  const [state, setState] = useState(() => normalize(prefs));
  const [error, setError] = useState(null);

  // Optimistically apply `next`, persist it, revert to `prev` on failure.
  const persist = (next, prev) => {
    setError(null);
    setState(next);
    Promise.resolve(mortgageService.putNotificationPrefs(suiteLoanId, next))
      .then(() => { if (onSaved) onSaved(next); })
      .catch(() => {
        setState(prev);
        setError("Couldn't save your notification settings. Please try again.");
      });
  };

  const toggleEnabled = (row) => {
    const next = { ...state, [row.enabledKey]: !state[row.enabledKey] };
    persist(next, state);
  };

  const setChannel = (row, channel) => {
    if (state[row.channelKey] === channel) return;
    const next = { ...state, [row.channelKey]: channel };
    persist(next, state);
  };

  return (
    <div className="lsc-card">
      <div className="lsc-card-h">
        <span className="lsc-cic lsc-cic--forest" aria-hidden="true">◉</span>
        <h3>Notifications</h3>
      </div>

      {error && <div className="lsc-np-error" role="alert">{error}</div>}

      {ROWS.map((row) => {
        const on = !!state[row.enabledKey];
        const channel = state[row.channelKey];
        return (
          <div className="lsc-np" key={row.enabledKey}>
            <div className="lsc-np-tx">
              <b>{row.label}</b>
              <span>{row.sub}</span>
            </div>
            <div className="lsc-np-ch">
              <button
                type="button"
                className={`lsc-chip${channel === 'EMAIL' ? ' is-on' : ''}`}
                onClick={() => setChannel(row, 'EMAIL')}
              >
                Email
              </button>
              <button
                type="button"
                className={`lsc-chip${channel === 'SMS' ? ' is-on' : ''}`}
                onClick={() => setChannel(row, 'SMS')}
              >
                SMS
              </button>
            </div>
            <button
              type="button"
              className={`lsc-sw${on ? ' is-on' : ''}`}
              aria-label={`Toggle ${row.label.toLowerCase()}`}
              aria-pressed={on}
              onClick={() => toggleEnabled(row)}
            />
          </div>
        );
      })}
    </div>
  );
}
