import React from 'react';

/**
 * Status pill. Tone maps to a color pair from the design tokens.
 * `dot=true` adds a 6px solid dot in the pill color.
 */
export default function Pill({ tone = 'muted', dot = false, children, className = '' }) {
  return (
    <span className={`pill ${tone} ${className}`.trim()}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}
