/**
 * Pill-style tab look used by the legacy form steps (Borrower / Employment /
 * Assets sub-tabs). The purple-gradient styling predates the design refresh
 * and was duplicated in three files before audit item M-4.
 *
 * Returns a style object that callers can spread directly or pass to
 * {@code style={...}}. Pure — no React, no state.
 *
 * NOTE: this doesn't match the new design-system token palette; it's
 * preserved as-is so the existing forms keep visual continuity. When the
 * form steps migrate to the design system, replace usages with the design
 * Pill / Button primitives.
 */
export const bubbleTabStyle = (isActive) => ({
  padding: '0.6rem 1.2rem',
  border: 'none',
  borderRadius: '20px',
  background: isActive
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : '#f0f0f0',
  color: isActive ? 'white' : '#666',
  cursor: 'pointer',
  fontWeight: isActive ? '600' : '500',
  fontSize: '0.9rem',
  transition: 'all 0.3s ease',
  boxShadow: isActive
    ? '0 4px 15px rgba(102, 126, 234, 0.4)'
    : '0 2px 5px rgba(0,0,0,0.1)',
  transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
  marginRight: '0.75rem',
  marginBottom: '0.5rem',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export default bubbleTabStyle;
