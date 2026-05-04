/**
 * Helpers for surfacing react-hook-form validation errors as human-readable messages.
 *
 * react-hook-form's `errors` is a nested tree where each leaf has shape
 *   { type, message?, ref?, types? }
 * Nested objects appear when fields are dotted (`property.city`) or array fields
 * (`borrowers.0.firstName`). We flatten that into a list the user can act on.
 */

/**
 * Walk the errors object and return all leaf entries as `{ path, message }`.
 * `path` is the dotted form-field path; `message` is the validator's message
 * (falls back to `'is required'` if a leaf has no explicit message).
 */
export function collectErrors(errors, prefix = '') {
  const out = [];
  if (!errors || typeof errors !== 'object') return out;

  for (const [key, val] of Object.entries(errors)) {
    if (!val) continue;
    const path = prefix ? `${prefix}.${key}` : key;

    // A leaf error has a `type` (validator name) and possibly a `message`.
    // Non-leaf nodes are plain objects without `type`.
    if (val.type !== undefined) {
      out.push({ path, message: val.message || humanizeValidatorType(val.type) });
      continue;
    }

    // Recurse into nested errors
    if (Array.isArray(val)) {
      val.forEach((item, idx) => {
        out.push(...collectErrors(item, `${path}.${idx}`));
      });
    } else {
      out.push(...collectErrors(val, path));
    }
  }
  return out;
}

function humanizeValidatorType(type) {
  switch (type) {
    case 'required':
      return 'is required';
    case 'pattern':
      return 'is in an invalid format';
    case 'min':
      return 'is below the minimum';
    case 'max':
      return 'is above the maximum';
    case 'minLength':
      return 'is too short';
    case 'maxLength':
      return 'is too long';
    case 'validate':
      return 'is invalid';
    default:
      return 'is invalid';
  }
}

/**
 * Turn a dotted form path into a friendly display label.
 *   "loanAmount"                 → "Loan Amount"
 *   "property.addressLine"       → "Property — Address Line"
 *   "borrowers.0.firstName"      → "Borrower 1 — First Name"
 *   "borrowers.0.residences.2.city" → "Borrower 1 — Residence 3 — City"
 */
export function humanizeFieldPath(path) {
  const parts = path.split('.');
  const labels = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    // Numeric segment? It's an array index — pair it with the previous label.
    if (/^\d+$/.test(part)) {
      const idx = Number(part);
      const prev = labels.pop();
      if (prev != null) {
        labels.push(`${singularize(prev)} ${idx + 1}`);
      } else {
        labels.push(`#${idx + 1}`);
      }
      continue;
    }
    labels.push(prettifyKey(part));
  }
  return labels.join(' — ');
}

function prettifyKey(key) {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\bSsn\b/i, 'SSN')
    .replace(/\bDob\b/i, 'DOB')
    .replace(/\bZip\b/i, 'ZIP')
    .replace(/\bUrl\b/i, 'URL')
    .replace(/\b(\w)/g, (m) => m.toUpperCase())
    .trim();
}

function singularize(label) {
  if (/ies$/i.test(label)) return label.replace(/ies$/i, 'y');
  if (/ses$/i.test(label)) return label.replace(/es$/i, '');
  if (/s$/i.test(label) && !/ss$/i.test(label)) return label.replace(/s$/i, '');
  return label;
}

/**
 * Build a concise summary of missing fields suitable for a toast: at most `max` lines,
 * with overflow ("and N more...") at the end.
 */
export function summarizeErrors(errors, max = 6) {
  const list = collectErrors(errors);
  if (list.length === 0) return null;
  const head = list.slice(0, max).map(({ path, message }) =>
    `${humanizeFieldPath(path)} ${message}`);
  if (list.length > max) {
    head.push(`…and ${list.length - max} more`);
  }
  return { count: list.length, lines: head };
}
