import React from 'react';

/**
 * Initials avatar with the design's two gradient variants:
 *   - brand  (forest, default — borrower / brand surfaces)
 *   - copper (staff / loan team)
 */
export default function Avatar({ initials, size = 40, variant = 'brand', className = '', style }) {
  const cls = ['av', variant === 'copper' ? 'av-copper' : 'av-brand', className].filter(Boolean).join(' ');
  const fontSize = Math.round(size * 0.34);
  const radius = size >= 56 ? 12 : size >= 36 ? 10 : 999;
  return (
    <div
      className={cls}
      style={{ width: size, height: size, borderRadius: radius, fontSize, ...style }}
    >
      {initials}
    </div>
  );
}
