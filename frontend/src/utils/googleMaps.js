/**
 * Google Maps JS API loader.
 *
 * Loads the Maps JS + Places library exactly once (deduped via a module-level
 * promise) and ONLY when REACT_APP_GOOGLE_MAPS_API_KEY is set at build time.
 *
 * Degrades gracefully: when no key is present this is a no-op that resolves
 * to null, so callers can branch on the result without any console noise.
 */

const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// Module-level promise so concurrent callers share a single load.
let loadPromise = null;

/**
 * Load the Google Maps JS API (with the Places library).
 *
 * @returns {Promise<object|null>} resolves to `window.google.maps` once loaded,
 *   or `null` if no API key is configured (or load fails).
 */
export function loadGoogleMaps() {
  // No key → degrade silently. No script injected, no errors.
  if (!API_KEY) {
    return Promise.resolve(null);
  }

  // Already loaded (e.g. another component loaded it).
  if (typeof window !== 'undefined' && window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  // Dedupe: reuse the in-flight / resolved promise.
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve) => {
    try {
      const script = document.createElement('script');
      script.src =
        'https://maps.googleapis.com/maps/api/js?key=' +
        encodeURIComponent(API_KEY) +
        '&libraries=places';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        resolve(
          (typeof window !== 'undefined' && window.google && window.google.maps) ||
            null
        );
      };
      script.onerror = () => {
        // Reset so a later attempt can retry, and degrade to null.
        loadPromise = null;
        resolve(null);
      };
      document.head.appendChild(script);
    } catch (e) {
      loadPromise = null;
      resolve(null);
    }
  });

  return loadPromise;
}

export default loadGoogleMaps;
