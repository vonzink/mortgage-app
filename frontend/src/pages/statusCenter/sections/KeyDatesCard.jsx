import React from 'react';

/*
 * KeyDatesCard — the "Key dates" card in the Loan Status Center right column.
 * Ported from the .drow / .dchip / .cal-open block of
 * docs/design/loan-status-center/MSFG Loan Status Center.html.
 *
 * Consumes payload.keyDates[]: { key, label, date, urgent }. Chips are sorted
 * ascending by date; each chip shows the UTC day-number + short month. urgent
 * rows get the "hot" (forest) treatment. An "Open calendar" button lifts intent
 * to the container via onOpenCalendar.
 */

const DAY_FMT = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', day: 'numeric' });
const MON_FMT = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short' });

function utcDate(value) {
  if (!value) return null;
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function KeyDatesCard({ keyDates, onOpenCalendar }) {
  const rows = (Array.isArray(keyDates) ? keyDates : [])
    .filter((d) => utcDate(d.date))
    .slice()
    .sort((a, b) => utcDate(a.date) - utcDate(b.date));

  return (
    <div className="lsc-card">
      <div className="lsc-card-h">
        <span className="lsc-cic lsc-cic--forest" aria-hidden="true">▦</span>
        <h3>Key dates</h3>
      </div>

      {rows.map((d, i) => {
        const dt = utcDate(d.date);
        return (
          <div className={`lsc-drow${d.urgent ? ' is-hot' : ''}`} key={d.key || i}>
            <div className="lsc-dchip">
              <b>{DAY_FMT.format(dt)}</b>
              <span>{MON_FMT.format(dt).toUpperCase()}</span>
            </div>
            <div className="lsc-drow-tx">
              <b>{d.label}</b>
            </div>
          </div>
        );
      })}

      <button type="button" className="lsc-cal-open" onClick={onOpenCalendar}>
        Open calendar
      </button>
    </div>
  );
}
