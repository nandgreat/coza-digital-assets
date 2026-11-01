/**
 * Reads a value from a nested analytics hook result without changing the hook's
 * existing state shape. This temporary adapter is intentionally defensive: it
 * allows the TailAdmin presentation shell to be introduced before the hook is
 * simplified in the later Inertia-native refactor.
 *
 * @param {object} source Raw value returned by useDashboardAnalytics().
 * @param {string[][]} paths Candidate property paths ordered by preference.
 * @param {*} fallback Value returned when no candidate exists.
 * @returns {*} First defined candidate value, otherwise fallback.
 */
export function firstDefined(source, paths, fallback = undefined) {
    for (const path of paths) {
        let value = source;

        for (const segment of path) {
            if (value === null || value === undefined) {
                value = undefined;
                break;
            }

            value = value[segment];
        }

        if (value !== undefined && value !== null) {
            return value;
        }
    }

    return fallback;
}

/**
 * Normalises a value for KPI presentation while preserving the original data.
 *
 * @param {*} value Raw analytics value.
 * @returns {string|number} Display-safe value.
 */
export function displayValue(value) {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    if (typeof value === 'number') {
        return new Intl.NumberFormat().format(value);
    }

    return value;
}

/**
 * Extracts dashboard-level values using aliases found in the existing analytics
 * implementation. No mutation is performed against the hook result.
 *
 * @param {object} analytics Raw hook result.
 * @returns {{ totalDownloads: *, uniqueUsers: *, changePercent: *, assetCount: * }} Display metrics.
 */
export function getDashboardMetrics(analytics) {
    return {
        totalDownloads: firstDefined(analytics, [
            ['normalizedDashboardData', 'totalDownloads'],
            ['dashboardData', 'totalDownloads'],
            ['dashboard', 'totalDownloads'],
            ['totalDownloads'],
            ['data', 'totalDownloads'],
        ], 0),
        uniqueUsers: firstDefined(analytics, [
            ['totalUniqueUsers'],
            ['normalizedDashboardData', 'totalUniqueUsers'],
            ['dashboardData', 'totalUniqueUsers'],
            ['dashboard', 'totalUniqueUsers'],
            ['uniqueUsers'],
        ], 0),
        changePercent: firstDefined(analytics, [
            ['normalizedDashboardData', 'totalPercent'],
            ['dashboardData', 'totalPercent'],
            ['dashboard', 'totalPercent'],
            ['totalPercent'],
        ], null),
        assetCount: firstDefined(analytics, [
            ['normalizedDashboardData', 'assetTotalCount'],
            ['dashboardData', 'assetTotalCount'],
            ['dashboard', 'assetTotalCount'],
            ['assetTotalCount'],
        ], 0),
    };
}

/**
 * Extracts supported analytics actions without requiring a state-shape rewrite.
 *
 * @param {object} analytics Raw hook result.
 * @returns {{ refresh: Function|null, exportData: Function|null, logout: Function|null, isRefreshing: boolean }} Action bridge.
 */
export function getDashboardActions(analytics) {
    return {
        refresh:
            analytics?.actions?.refresh ??
            analytics?.actions?.handleRefresh ??
            analytics?.handleRefresh ??
            analytics?.refresh ??
            null,
        exportData:
            analytics?.actions?.exportData ??
            analytics?.actions?.handleExport ??
            analytics?.handleExport ??
            analytics?.exportData ??
            null,
        logout:
            analytics?.actions?.logout ??
            analytics?.actions?.handleLogout ??
            analytics?.handleLogout ??
            analytics?.postLogout ??
            null,
        isRefreshing: Boolean(
            analytics?.isRefreshing ??
                analytics?.refreshing ??
                analytics?.state?.isRefreshing ??
                analytics?.state?.refreshing
        ),
    };
}
