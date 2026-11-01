/**
 * ============================================================
 * Analytics Route Contracts
 * ============================================================
 *
 * Centralizes browser-facing analytics route strings. The dashboard page is
 * the canonical transport for ordinary dashboard reads. JSON endpoints that
 * remain are explicit compatibility or background-operation contracts.
 * ============================================================
 */

/**
 * Canonical analytics dashboard route.
 *
 * @type {string}
 */
export const ANALYTICS_DASHBOARD_ROUTE = '/analytics';

/**
 * Shared analytics route definitions.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const ANALYTICS_ROUTES = Object.freeze({
    dashboard: ANALYTICS_DASHBOARD_ROUTE,
    refresh: '/analytics/refresh',
    refreshStatus: '/analytics/refresh-status',
    export: '/analytics/export',
    logout: '/analytics/logout',
});

/**
 * Remove empty query parameters before an Inertia visit.
 *
 * @param {Object} params
 * @returns {Object}
 */
export function normalizeAnalyticsVisitParams(params = {}) {
    return Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
    );
}
