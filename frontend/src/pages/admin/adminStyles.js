// Shared, tokenized inline style constants for the admin pages.
// Single source of truth so AdminHome / AppSettingsAdmin / UsersAdmin
// stay visually consistent on the MSFG brand palette.
//
// Brand palette references:
//   spring      #1fb463   (primary action fill)
//   spring lip  #0c6b39   (3D button shadow)
//   spring soft #1fb46324 (tinted badge bg)
//   spring deep #135e48   (badge text on spring-soft)
//   ink         #0b231c   (text on spring fill)
//   rose        #a8423a   (danger)
//   rose bg     #f6dfdd   (danger badge bg)
//   amber       #c08527   (warn text)
//   amber bg    #faecd0   (warn badge bg)
//   gray text   #5a6b61
//   gray line   #e2e6dd

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  background: 'var(--bg-card, white)',
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

export const th = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  borderBottom: '2px solid var(--border-color, #e2e6dd)',
  fontSize: '0.85rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary, #5a6b61)',
};

export const td = {
  padding: '0.9rem 1rem',
  borderBottom: '1px solid var(--border-color, #e2e6dd)',
  fontSize: '0.9rem',
  verticalAlign: 'top',
};

export const monoCell = {
  ...td,
  fontFamily: MONO,
  fontSize: '0.85rem',
};

export const primaryBtn = {
  padding: '0.5rem 1rem',
  background: '#1fb463',
  color: '#0b231c',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  marginLeft: 'auto',
  fontWeight: 600,
  boxShadow: '0 3px 0 #0c6b39',
};

export const secondaryBtn = {
  padding: '0.5rem 1rem',
  background: 'transparent',
  border: '1px solid var(--border-color, #e2e6dd)',
  borderRadius: 6,
  cursor: 'pointer',
};

export const linkBtn = {
  background: 'transparent',
  border: 'none',
  color: '#135e48',
  cursor: 'pointer',
  marginRight: '1rem',
  padding: '4px 8px',
  borderRadius: 4,
};

export const dangerLinkBtn = {
  background: 'transparent',
  border: 'none',
  color: '#a8423a',
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 4,
};

export const input = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid var(--border-color, #e2e6dd)',
  borderRadius: 6,
  fontSize: '0.9rem',
};

export const monoTextarea = {
  ...input,
  fontFamily: MONO,
  fontSize: 12,
  resize: 'vertical',
};

export const mutedText = { color: 'var(--text-secondary, #5a6b61)' };

export const dangerText = { color: '#a8423a' };

export const helpText = { color: '#5a6b61' };

export const amberText = { color: '#c08527' };

export const fieldLabel = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 500,
  marginBottom: '0.25rem',
  color: 'var(--text-secondary, #5a6b61)',
};

// Named brand badge palettes.
const BADGE_PALETTES = {
  rose: { bg: '#f6dfdd', fg: '#a8423a' },
  amber: { bg: '#faecd0', fg: '#c08527' },
  spring: { bg: '#1fb46324', fg: '#135e48' },
};

// badge('rose'|'amber'|'spring') OR badge(bgHex, fgHex) for ad-hoc pairs.
export function badge(kindOrBg, fg) {
  let bg = kindOrBg;
  let color = fg;
  if (BADGE_PALETTES[kindOrBg]) {
    bg = BADGE_PALETTES[kindOrBg].bg;
    color = BADGE_PALETTES[kindOrBg].fg;
  }
  return {
    display: 'inline-block',
    padding: '0.15rem 0.5rem',
    borderRadius: 4,
    background: bg,
    color,
    fontSize: '0.75rem',
    fontWeight: 600,
  };
}

// Brand card hover border (replaces the old blue mutation in AdminHome).
export const cardHoverBorder = '#1fb463';
