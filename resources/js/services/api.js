/**
 * ============================================================
 * API Service – COZA Analytics Dashboard
 * ============================================================
 *
 * This module centralizes all HTTP requests to the backend.
 * It uses Axios with default credentials (cookies) and a
 * base URL prefix of '/analytics' as defined in web.php.
 *
 * Refactored (Solution 2): Explicitly configures 'Accept': 'application/json'
 * on both the global instance and individual endpoint requests to ensure
 * Laravel controller routes consistently respond with JSON payloads rather
 * than standard Inertia HTML renders or redirects.
 * ============================================================
 */

import axios from 'axios';

/**
 * Axios instance configured for the analytics backend.
 * - `baseURL`: prepends '/analytics' to all relative URLs.
 * - `withCredentials`: sends cookies (session) for auth.
 * - `headers.Accept`: explicitly requires JSON responses from server endpoints.
 */
const api = axios.create({
  baseURL: '/analytics',
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
  },
});

/**
 * Fetch the main dashboard data for a given date range and filters.
 * Explicitly sends JSON and Inertia headers to ensure dynamic payload retrieval.
 *
 * @param {Object} params - Query parameters.
 * @param {string} params.start_date - Start date (YYYY-MM-DD).
 * @param {string} params.end_date - End date (YYYY-MM-DD).
 * @param {string} [params.service_type] - Filter by service type.
 * @param {string} [params.program] - Filter by program.
 * @param {AbortSignal} [signal] - Optional cancellation signal.
 * @returns {Promise<Object>} Axios response containing dashboard payload.
 */
export const getDashboard = (params, signal) => 
  api.get('/api/analytics/data', { 
    params,
    signal,
    headers: {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', 
      // 'X-Inertia': undefined, // Prevents Inertia version middleware from intercepting
    },
  });

/**
 * Fetch available filter options (service types and programs).
 * Used to populate dropdown menus dynamically.
 *
 * @param {AbortSignal} [signal] - Optional cancellation signal.
 * @returns {Promise<Object>} Axios response containing { serviceTypes: string[], programs: string[] }.
 */
export const getFilters = (signal) => 
  api.get('/filters', {
    signal,
    headers: {
      'Accept': 'application/json',
    },
  });

/**
 * Fetch a paginated breakdown of downloads by asset or service type.
 *
 * @param {Object} params - Query parameters.
 * @param {string} params.start_date - Start date (YYYY-MM-DD).
 * @param {string} params.end_date - End date (YYYY-MM-DD).
 * @param {string} params.breakdown - 'asset' or 'service'.
 * @param {number} params.offset - Pagination offset (multiples of 10).
 * @param {string} [params.service_type] - Optional service type filter.
 * @param {string} [params.program] - Optional program filter.
 * @param {AbortSignal} [signal] - Optional cancellation signal.
 * @returns {Promise<Object>} Axios response containing { items: Array<{ asset_type|service_type, eventCount }> }.
 */
export const getBreakdown = (params, signal) => 
  api.get('/breakdown', { 
    params,
    signal,
    headers: {
      'Accept': 'application/json',
    },
  });

/**
 * Fetch paginated top sessions.
 *
 * @param {Object} params - Query parameters.
 * @param {string} params.start_date - Start date.
 * @param {string} params.end_date - End date.
 * @param {string} [params.service_type] - Service type filter.
 * @param {string} [params.program] - Program filter.
 * @param {number} params.offset - Pagination offset.
 * @param {number} params.limit - Items per page.
 * @param {AbortSignal} [signal] - Optional cancellation signal.
 * @returns {Promise<Object>} Axios response containing { data, total, offset, limit }.
 */
export const getSessions = (params, signal) => 
  api.get('/sessions', { 
    params,
    signal,
    headers: {
      'Accept': 'application/json',
    },
  });

/**
 * Trigger a manual refresh of analytics data from GA4.
 * This dispatches a background job and returns immediately.
 *
 * @param {Object} params - Query parameters (same as dashboard).
 * @returns {Promise<Object>} Axios response containing { status: 'refreshing' }.
 */
export const postRefresh = (params) => 
  api.post('/refresh', null, { 
    params,
    headers: {
      'Accept': 'application/json',
    },
  });

/**
 * Poll the refresh status to know when the background job is done.
 *
 * @param {Object} params - Query parameters (same as dashboard).
 * @returns {Promise<Object>} Axios response containing { status: 'in_progress'|'done'|'failed', data?: Object }.
 */
export const getRefreshStatus = (params) => 
  api.get('/refresh-status', { 
    params,
    headers: {
      'Accept': 'application/json',
    },
  });

/**
 * Fetch supplementary GA4 user geographic location metrics.
 *
 * @param {Object} params - Query parameters.
 * @param {AbortSignal} [signal] - Optional cancellation signal.
 * @returns {Promise<Object>} Axios response containing geo location metrics.
 */
export const getGeoData = (params, signal) => 
  api.get('/geo', { 
    params,
    signal,
    headers: {
      'Accept': 'application/json',
    },
  });

/**
 * Fetch unique active users grouped by asset type from GA4.
 *
 * @param {Object} params - Query parameters.
 * @param {AbortSignal} [signal] - Optional cancellation signal.
 * @returns {Promise<Object>} Axios response containing active user counts per asset.
 */
export const getUniqueByAsset = (params, signal) => 
  api.get('/unique-by-asset', { 
    params,
    signal,
    headers: {
      'Accept': 'application/json',
    },
  });

/**
 * Generate and download a CSV export of the current dashboard data.
 * Opens a direct HTTP download stream.
 *
 * @param {Object} params - Query parameters (same as dashboard).
 * @returns {string} The full URL for the export endpoint.
 */
export const getExportUrl = (params) => {
  const url = new URL('/analytics/export', window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });
  return url.toString();
};

/**
 * Log out the current analytics user.
 * Clears the session and redirects to the login page.
 *
 * @returns {Promise<Object>} Axios response confirming logout.
 */
export const postLogout = () => 
  api.post('/logout', null, {
    headers: {
      'Accept': 'application/json',
    },
  });