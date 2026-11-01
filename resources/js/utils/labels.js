/**
 * Label helpers shared by the analytics hooks and the tracker.
 *
 * A "named" label is a real value. Blank values and the placeholders GA4 or
 * the tracker emit when a dimension is missing are NOT real values and must
 * never be shown as their own bar / slice (e.g. "Unknown", "Uncategorized").
 */
const PLACEHOLDERS = new Set([
    '',
    'unknown',
    '(unknown)',
    'not set',
    '(not set)',
    'null',
    'undefined',
    'n/a',
    'uncategorised',
    'uncategorized',
]);

/** True when `value` is a real, displayable label. */
export function isNamedLabel(value) {
    if (value === null || value === undefined) return false;

    return !PLACEHOLDERS.has(String(value).trim().toLowerCase());
}

/** Trimmed value, or undefined when it is blank / a placeholder (so GA4 gets no param). */
export function cleanParam(value) {
    return isNamedLabel(value) ? String(value).trim() : undefined;
}
