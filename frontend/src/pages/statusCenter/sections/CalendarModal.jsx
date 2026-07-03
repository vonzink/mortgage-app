import React, { useEffect, useMemo, useState } from 'react';

/*
 * CalendarModal — the key-date calendar opened from KeyDatesCard's "Open calendar".
 * Ported from the .modal-bg / .modal / .mgrid / .mlist block of
 * docs/design/loan-status-center/MSFG Loan Status Center.html.
 *
 * Date math is copied verbatim from components/calendar/LoanCalendar.jsx: the grid
 * dates are constructed at UTC midnight and formatted with UTC-pinned Intl formatters,
 * because a local-time formatter renders the previous day/month west of Greenwich
 * (the documented off-by-one) on UTC-midnight ISO dates.
 *
 * Props: { keyDates: [{ key, label, date: ISOdate, urgent }], onClose, now? }.
 *   - Opens on the month of the earliest upcoming event (date >= today UTC); if none
 *     upcoming, the current month (UTC-derived from `now`).
 *   - now defaults to new Date(); overridable for deterministic tests.
 */

const MONTH_FMT = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const MON_SHORT_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** ISO date-ish value → 'YYYY-MM-DD' or null if unparseable. */
function dayKey(value) {
  if (!value) return null;
  const k = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(k) ? k : null;
}

export default function CalendarModal({ keyDates, onClose, now = new Date() }) {
  // today baseline in UTC terms (matches the UTC dayKeys we compare against)
  const todayKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;

  const events = useMemo(() => {
    return (Array.isArray(keyDates) ? keyDates : [])
      .map((d) => ({ dateKey: dayKey(d.date), label: d.label, urgent: !!d.urgent }))
      .filter((e) => e.dateKey);
  }, [keyDates]);

  const byDay = useMemo(() => {
    const m = new Map();
    for (const ev of events) {
      if (!m.has(ev.dateKey)) m.set(ev.dateKey, []);
      m.get(ev.dateKey).push(ev);
    }
    return m;
  }, [events]);

  // default month = earliest upcoming event's month, else current (UTC) month
  const defaultMonth = useMemo(() => {
    const upcoming = events
      .filter((e) => e.dateKey >= todayKey)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return (upcoming[0]?.dateKey || todayKey).slice(0, 7);
  }, [events, todayKey]);

  const [month, setMonth] = useState(defaultMonth); // 'YYYY-MM'

  // close on Escape (module-level document listener, cleaned up on unmount)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const [year, monthIdx] = [Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1];
  const firstDow = new Date(Date.UTC(year, monthIdx, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
  const prevDays = new Date(Date.UTC(year, monthIdx, 0)).getUTCDate();
  const shift = (delta) => {
    const d = new Date(Date.UTC(year, monthIdx + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  };

  // this month's events, ascending, for the list
  const monthEvents = events
    .filter((e) => e.dateKey.slice(0, 7) === month)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  return (
    <div className="lsc-modal-bg open" onClick={onClose}>
      {/* stop propagation so clicks inside the card don't reach the backdrop handler */}
      <div className="lsc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lsc-modal-head">
          <h3>{MONTH_FMT.format(new Date(Date.UTC(year, monthIdx, 1)))}</h3>
          <div className="lsc-modal-nav">
            <button type="button" aria-label="Previous month" onClick={() => shift(-1)}>‹</button>
            <button type="button" aria-label="Next month" onClick={() => shift(1)}>›</button>
          </div>
          <button type="button" className="lsc-modal-close" aria-label="Close" onClick={onClose}>✕</button>
        </div>

        <div className="lsc-cal-grid">
          {WEEKDAYS.map((d, i) => (
            <div className="lsc-cal-dow" key={`dow-${i}`}>{d}</div>
          ))}
          {Array.from({ length: firstDow }, (_, i) => (
            <div className="lsc-cal-day out" key={`out-${i}`}>{prevDays - firstDow + 1 + i}</div>
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dk = `${month}-${String(i + 1).padStart(2, '0')}`;
            const evs = byDay.get(dk);
            const hot = evs && evs.some((e) => e.urgent);
            const cls = `lsc-cal-day${evs ? ' ev' : ''}${hot ? ' hot' : ''}`;
            return (
              <div
                className={cls}
                key={dk}
                title={evs ? evs.map((e) => e.label).join(', ') : undefined}
              >
                {i + 1}
              </div>
            );
          })}
        </div>

        <div className="lsc-cal-list">
          {monthEvents.length === 0 ? (
            <div className="lsc-cal-ev">
              <b className="lsc-cal-empty">No loan dates this month</b>
            </div>
          ) : (
            monthEvents.map((ev, i) => (
              <div className={`lsc-cal-ev${ev.urgent ? ' hot' : ''}`} key={`${ev.dateKey}-${i}`}>
                <span className="lsc-cal-dot" />
                <b>{ev.label}</b>
                <span>{MON_SHORT_FMT.format(new Date(`${ev.dateKey}T12:00:00Z`))} {Number(ev.dateKey.slice(8, 10))}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
