/**
 * ============================================================
 * Dashboard filter seeding
 * ============================================================
 *
 * The dashboard's filter state (dates, preset highlight, service, program) lives in
 * React state, while the data on screen lives in the Inertia page props. When the
 * page component is mounted again - a hard reload, a browser restoring a discarded
 * idle tab, a dev-server reload, a remount - React state starts from its defaults
 * but the props still hold the last filtered result. The bar then showed "All Time"
 * (and treated a click on it as a no-op, because nothing appeared to change) over
 * data that was filtered to something else.
 *
 * The server already returns the filters it actually used in `filters`, so the state
 * is seeded from those: what is highlighted is always what produced the numbers.
 * ============================================================
 */

import { DATE_PRESETS, detectDatePreset, getDatePresetRange, isIsoDate } from '@/utils/dateHelpers';

const PRESET_STORAGE_KEY = 'coza.analytics.datePreset';

/**
 * Remembers which quick preset the user clicked (some presets share the same dates).
 *
 * @param {string} preset - Preset key.
 * @param {string} startDate - ISO start date the preset produced.
 * @param {string} endDate - ISO end date the preset produced.
 * @returns {void}
 */
export function rememberPreset(preset, startDate, endDate) {
  try {
    window.sessionStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify({ preset, startDate, endDate }));
  } catch {
    // Storage unavailable (private mode, quota): the preset is then detected from the dates.
  }
}

/**
 * Returns the remembered preset only when it still describes exactly these dates.
 *
 * @param {string} startDate - ISO start date.
 * @param {string} endDate - ISO end date.
 * @returns {string|null}
 */
function recallPreset(startDate, endDate) {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(PRESET_STORAGE_KEY) ?? 'null');

    if (
      stored
      && stored.startDate === startDate
      && stored.endDate === endDate
      && DATE_PRESETS.some((preset) => preset.key === stored.preset)
    ) {
      return stored.preset;
    }
  } catch {
    // Ignore unreadable storage.
  }

  return null;
}

/**
 * Builds the initial filter state from the dashboard payload the page was rendered with.
 *
 * @param {Object|null} initialData - Dashboard payload (`analyticsDashboard`), may be null.
 * @returns {{startDate: string, endDate: string, serviceType: string, program: string, activePreset: string}}
 */
export function seedDashboardFilters(initialData) {
  const defaults = getDatePresetRange('default');
  const served = initialData?.filters ?? initialData?.data?.filters ?? {};

  let startDate = isIsoDate(served.start_date) ? served.start_date : defaults.startDate;
  let endDate = isIsoDate(served.end_date) ? served.end_date : defaults.endDate;

  if (startDate > endDate) {
    startDate = defaults.startDate;
    endDate = defaults.endDate;
  }

  return {
    startDate,
    endDate,
    serviceType: typeof served.service_type === 'string' ? served.service_type : '',
    program: typeof served.program === 'string' ? served.program : '',
    activePreset: recallPreset(startDate, endDate) ?? detectDatePreset(startDate, endDate),
  };
}
