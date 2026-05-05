/**
 * Dev-only console logger. No-ops in production builds so verbose form / API
 * tracing doesn't leak to end users.
 *
 * Usage: `debug('Loading application', id, data)` — same shape as console.log.
 */
const isDev =
  typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production';

export function debug(...args) {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log('[debug]', ...args);
  }
}
