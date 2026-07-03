import React, { useEffect, useMemo, useState } from 'react';
import mortgageService from '../../services/mortgageService';
import { Card } from '../design/Card';
import Icon from '../design/Icon';

/**
 * Borrower loan calendar — the client's key dates (closing, contingencies, lock, TRID
 * deliveries, milestones) from the suite's Data Tracking, borrower-safe subset only
 * (GET /api/loans/{id}/borrower/tracking). Read-only: staff maintain the dates in the
 * suite console; the borrower sees a month grid plus an "upcoming" list.
 */

// Formatters pinned to UTC: grid dates are constructed at UTC midnight, and a local-time
// formatter would render the previous day/month west of Greenwich.
const MONTH_FMT = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const DAY_FMT = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** entries → [{ dateKey: 'YYYY-MM-DD', label }] for everything that has a date value. */
export function toEvents(entries) {
  return (entries || [])
    .filter((e) => e.value && (e.kind === 'DATE' || e.kind === 'DATETIME'))
    .map((e) => ({ dateKey: String(e.value).slice(0, 10), label: e.label }));
}

export default function LoanCalendar({ suiteLoanId, initialMonth }) {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(false);
  // month = 'YYYY-MM' (the user's local month, not UTC's)
  const now = new Date();
  const localMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(initialMonth ?? localMonth);

  useEffect(() => {
    let stale = false;
    (async () => {
      if (!suiteLoanId) { setEntries([]); return; }
      try {
        const list = await mortgageService.getBorrowerTracking(suiteLoanId);
        if (!stale) setEntries(list);
      } catch (e) {
        if (!stale) { setEntries([]); setError(true); }
      }
    })();
    return () => { stale = true; };
  }, [suiteLoanId]);

  const events = useMemo(() => toEvents(entries), [entries]);
  const byDay = useMemo(() => {
    const m = new Map();
    for (const ev of events) {
      if (!m.has(ev.dateKey)) m.set(ev.dateKey, []);
      m.get(ev.dateKey).push(ev.label);
    }
    return m;
  }, [events]);

  const [year, monthIdx] = [Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1];
  const firstDow = new Date(Date.UTC(year, monthIdx, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
  const shift = (delta) => {
    const d = new Date(Date.UTC(year, monthIdx + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  };

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const upcoming = events
    .filter((ev) => ev.dateKey >= todayKey)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(0, 6);

  if (entries === null) {
    return <Card pad className="loan-calendar"><div className="muted">Loading your loan calendar…</div></Card>;
  }

  return (
    <Card pad className="loan-calendar" data-testid="loan-calendar">
      <div className="card-header">
        <div className="card-title">
          <Icon name="clock" size={14} stroke={1.8} /><span>Loan Calendar</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" aria-label="Previous month" onClick={() => shift(-1)}>‹</button>
          <span data-testid="calendar-month" style={{ minWidth: 130, textAlign: 'center' }}>
            {MONTH_FMT.format(new Date(Date.UTC(year, monthIdx, 1)))}
          </span>
          <button type="button" aria-label="Next month" onClick={() => shift(1)}>›</button>
        </div>
      </div>

      {error && (
        <div className="muted" style={{ margin: '4px 0 8px' }}>
          We couldn't load your dates right now — check back soon.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginTop: 8 }}>
        {WEEKDAYS.map((d) => (
          <div key={d} className="muted" style={{ textAlign: 'center', fontSize: 11 }}>{d}</div>
        ))}
        {Array.from({ length: firstDow }, (_, i) => <div key={`blank-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dayKey = `${month}-${String(i + 1).padStart(2, '0')}`;
          const labels = byDay.get(dayKey);
          return (
            <div
              key={dayKey}
              data-testid={`calendar-day-${dayKey}`}
              title={labels ? labels.join(', ') : undefined}
              style={{
                minHeight: 40,
                borderRadius: 6,
                padding: 4,
                fontSize: 12,
                textAlign: 'center',
                border: '1px solid var(--border, #e5e7eb)',
                background: labels ? 'rgba(128, 227, 168, 0.25)' : 'transparent',
                fontWeight: dayKey === todayKey ? 700 : 400,
              }}
            >
              <div>{i + 1}</div>
              {labels && (
                <div style={{ fontSize: 9, lineHeight: 1.2, overflow: 'hidden' }}>
                  {labels[0]}{labels.length > 1 ? ` +${labels.length - 1}` : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        <h4 style={{ margin: '0 0 6px' }}>Upcoming</h4>
        {upcoming.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>
            No upcoming dates yet — they'll appear here as your loan progresses.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4 }}>
            {upcoming.map((ev) => (
              <li key={`${ev.dateKey}-${ev.label}`} style={{ fontSize: 13 }}>
                <strong>{DAY_FMT.format(new Date(`${ev.dateKey}T12:00:00Z`))}</strong>
                {' — '}{ev.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
