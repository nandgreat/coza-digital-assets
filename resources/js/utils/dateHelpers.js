/**
 * ============================================================
 * Date Helpers – COZA Analytics Dashboard
 * ============================================================
 *
 * Provides utility functions and preset configurations for handling
 * dashboard date formatting, range calculations, and preset selections.
 * Includes support for daily, weekly, monthly, yearly, and quarterly ranges.
 * ============================================================
 */

/**
 * Predefined date range presets available across the application.
 * @type {Array<{key: string, label: string}>}
 */
export const DATE_PRESETS = [
  { key: 'default', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'ytd', label: 'Year to Date' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'last_quarter', label: 'Last Quarter' },
  { key: 'q1', label: 'Q1 (Jan-Mar)' },
  { key: 'q2', label: 'Q2 (Apr-Jun)' },
  { key: 'q3', label: 'Q3 (Jul-Sep)' },
  { key: 'q4', label: 'Q4 (Oct-Dec)' },
];

/**
 * Formats a JavaScript Date object or string into YYYY-MM-DD.
 *
 * @param {Date|string} date - Date object or ISO string.
 * @returns {string} Formatted date string.
 */
const formatLocalDate = (date) => {
  // Convert string to Date if needed
  let d = (date instanceof Date) ? date : new Date(date);

  // Fallback to today if invalid
  if (isNaN(d.getTime())) {
    d = new Date();
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns the default date range for the dashboard.
 * The start date is the launch baseline (July 3, 2026) and the end date is today.
 *
 * @returns {{ startDate: string, endDate: string }}
 */
const getDefaultDateRange = () => {
  const startDate = '2026-07-03';
  const end = new Date();
  const endDate = formatLocalDate(end);
  return { startDate, endDate };
};

/**
 * Determines the quarter number (1-4) for a given date.
 *
 * @param {Date} date - Date object.
 * @returns {number} Quarter number (1-4).
 */
const getQuarter = (date) => {
  return Math.floor(date.getMonth() / 3) + 1;
};

/**
 * Returns the start and end dates of a specific quarter in a given year.
 *
 * @param {number} year - Full year (e.g., 2026).
 * @param {number} quarter - Quarter number (1-4).
 * @returns {{ startDate: Date, endDate: Date }} - Date objects for quarter bounds.
 */
const getQuarterRange = (year, quarter) => {
  const startMonth = (quarter - 1) * 3; // 0-indexed month
  const endMonth = startMonth + 2;      // last month of quarter

  const startDate = new Date(year, startMonth, 1);
  const endDate = new Date(year, endMonth + 1, 0); // last day of end month

  return { startDate, endDate };
};

/**
 * Returns the current quarter's range (from first day to today).
 *
 * @returns {{ startDate: string, endDate: string }}
 */
const getThisQuarterRange = () => {
  const today = new Date();
  const year = today.getFullYear();
  const quarter = getQuarter(today);
  const { startDate } = getQuarterRange(year, quarter);
  const endDate = formatLocalDate(today);

  return { startDate: formatLocalDate(startDate), endDate };
};

/**
 * Returns the previous quarter's full range.
 *
 * @returns {{ startDate: string, endDate: string }}
 */
const getLastQuarterRange = () => {
  const today = new Date();
  let year = today.getFullYear();
  let quarter = getQuarter(today) - 1;

  if (quarter === 0) {
    quarter = 4;
    year -= 1;
  }

  const { startDate, endDate } = getQuarterRange(year, quarter);
  return {
    startDate: formatLocalDate(startDate),
    endDate: formatLocalDate(endDate),
  };
};

/**
 * Returns the full range for a specific quarter number.
 *
 * @param {number} quarter - Quarter number (1-4).
 * @returns {{ startDate: string, endDate: string }}
 */
const getSpecificQuarterRange = (quarter) => {
  const today = new Date();
  const year = today.getFullYear();
  // If the requested quarter is in the past, keep current year; else use previous year? 
  // Better: Use the current year. If the quarter has already passed, we still show that year's quarter.
  const { startDate, endDate } = getQuarterRange(year, quarter);
  return {
    startDate: formatLocalDate(startDate),
    endDate: formatLocalDate(endDate),
  };
};

/**
 * Calculates start and end date strings for predefined dashboard date presets.
 *
 * Supported preset keys:
 * - 'today': Current calendar day
 * - 'yesterday': Previous calendar day
 * - '7d': Last 7 days including today
 * - '30d': Last 30 days including today
 * - 'this_month': First day of current month to today
 * - 'last_month': Full previous calendar month
 * - 'ytd': Start of current year to today
 * - 'default': Launch baseline (July 3, 2026) to today
 * - 'this_quarter': Start of current quarter to today
 * - 'last_quarter': Full previous quarter
 * - 'q1' ... 'q4': Full specific quarter of the current year
 *
 * @param {string} preset - Identifier key for preset selection.
 * @returns {{ startDate: string, endDate: string }}
 */
export function getDatePresetRange(preset) {
  const today = new Date();
  const endDate = formatLocalDate(today);

  switch (preset) {
    case 'today':
      return { startDate: endDate, endDate };

    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const formatted = formatLocalDate(yesterday);
      return { startDate: formatted, endDate: formatted };
    }

    case '7d': {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      return { startDate: formatLocalDate(sevenDaysAgo), endDate };
    }

    case '30d': {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 29);
      return { startDate: formatLocalDate(thirtyDaysAgo), endDate };
    }

    case 'this_month': {
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: formatLocalDate(firstOfMonth), endDate };
    }

    case 'last_month': {
      const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        startDate: formatLocalDate(firstOfLastMonth),
        endDate: formatLocalDate(lastOfLastMonth),
      };
    }

    case 'ytd': {
      const firstOfYear = new Date(today.getFullYear(), 0, 1);
      return { startDate: formatLocalDate(firstOfYear), endDate };
    }

    case 'this_quarter': {
      return getThisQuarterRange();
    }

    case 'last_quarter': {
      return getLastQuarterRange();
    }

    // Specific quarters (Q1–Q4) of the current year
    case 'q1':
    case 'q2':
    case 'q3':
    case 'q4': {
      const quarter = parseInt(preset.charAt(1), 10); // Extract 1-4 from 'q1' etc.
      return getSpecificQuarterRange(quarter);
    }

    case 'default':
    default:
      return getDefaultDateRange();
  }
}

/**
 * Whether a value is a real calendar date written as YYYY-MM-DD.
 *
 * @param {unknown} value - Candidate value.
 * @returns {boolean}
 */
export function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Finds the quick preset whose range is exactly the given dates.
 *
 * Presets are checked in `DATE_PRESETS` order, so when two presets cover the same
 * dates (e.g. "This Month" and "This Quarter" in the first month of a quarter) the
 * earlier one wins. Callers that remember what the user actually clicked should
 * prefer that over this guess.
 *
 * @param {string} startDate - ISO start date.
 * @param {string} endDate - ISO end date.
 * @returns {string} A `DATE_PRESETS` key, or 'custom' when no preset matches.
 */
export function detectDatePreset(startDate, endDate) {
  for (const { key } of DATE_PRESETS) {
    const range = getDatePresetRange(key);

    if (range.startDate === startDate && range.endDate === endDate) {
      return key;
    }
  }

  return 'custom';
}
