/**
 * Pill-style tab look used by the legacy form steps (Borrower / Employment /
 * Assets sub-tabs). Restyled to the MSFG brand palette: active tabs are a
 * flat spring fill with ink text and a copper lip shadow; inactive tabs are a
 * flat paper-2 chip with a hairline border. Hover is expressed via the CSS
 * `.form-tab:hover` rule in forms.css (callers add the `form-tab` class), not
 * a DOM-mutating handler.
 *
 * Returns a style object that callers can spread directly or pass to
 * {@code style={...}}. Pure — no React, no state.
 */
export const bubbleTabStyle = (isActive) => ({
  padding: '0.6rem 1.2rem',
  border: isActive ? 'none' : '1px solid #e2e6dd',
  borderRadius: '20px',
  background: isActive ? '#1fb463' : '#f2f4ef',
  color: isActive ? '#0b231c' : '#5a6b61',
  cursor: 'pointer',
  fontWeight: isActive ? '600' : '500',
  fontSize: '0.9rem',
  transition: 'background 0.15s ease, color 0.15s ease',
  boxShadow: isActive ? '0 3px 0 #0c6b39' : 'none',
  marginRight: '0.75rem',
  marginBottom: '0.5rem',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export default bubbleTabStyle;
