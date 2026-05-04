import { useEffect, useRef } from 'react';

/**
 * Persist react-hook-form values to sessionStorage so an unexpected redirect (e.g. session
 * expired → re-auth round-trip) doesn't lose work in progress.
 *
 * Usage:
 * ```js
 *   useDraftAutosave({
 *     watch,                                // from useForm()
 *     getValues,                            // from useForm()
 *     reset,                                // from useForm()
 *     storageKey: editId ? `draft:edit:${editId}` : 'draft:new',
 *     enabled: !isViewing,
 *   });
 * ```
 *
 * On mount: if a draft exists at storageKey, the form is reset to those values so the user
 * picks up where they left off. On every change (debounced), the current values are written
 * back. Call {@link clearDraft} after a successful submit to dismiss it.
 */
export function useDraftAutosave({ watch, getValues, reset, storageKey, enabled = true, debounceMs = 1000 }) {
  const restoredRef = useRef(false);

  // 1) Restore on mount (once)
  useEffect(() => {
    if (!enabled || restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft && typeof draft === 'object') {
        // eslint-disable-next-line no-console
        console.info('[useDraftAutosave] Restoring saved draft from', storageKey);
        reset(draft);
      }
    } catch (e) {
      // Corrupt draft — toss it
      sessionStorage.removeItem(storageKey);
    }
  }, [enabled, storageKey, reset]);

  // 2) Save on change (debounced)
  useEffect(() => {
    if (!enabled) return undefined;
    let timer = null;
    const sub = watch(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(getValues()));
        } catch (e) {
          // sessionStorage quota or serialize error — non-fatal
          // eslint-disable-next-line no-console
          console.warn('[useDraftAutosave] Failed to save draft:', e?.message);
        }
      }, debounceMs);
    });
    return () => {
      if (timer) clearTimeout(timer);
      sub.unsubscribe?.();
    };
  }, [enabled, watch, getValues, storageKey, debounceMs]);
}

/** Clear a draft after successful submit, or when the user navigates away on purpose. */
export function clearDraft(storageKey) {
  try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
}
