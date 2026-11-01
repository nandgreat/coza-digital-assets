/**
 * ============================================================
 * Dashboard Page – COZA Analytics
 * ============================================================
 *
 * Primary analytics reporting canvas. Connects backend analytics hooks
 * to presentation layers within the single AppLayout shell.
 *
 * MIGRATION GUARANTEES:
 * - `useDashboardAnalytics()` remains the sole source of analytics state[cite: 28].
 * - API contracts, date parameters, and refresh workflows are preserved[cite: 28].
 * - Responsive grid structures automatically adapt chart layouts based on 
 *   device viewport width and sidebar expansion state[cite: 28, 29].
 *
 * BRAND REVAMP (v2.0):
 * - All accent colors now resolve through the COZA design tokens defined in
 *   `analyticsDashboard.css` (`--coza-primary` royal purple, `--coza-gold`,
 *   `--coza-emerald`, and white/neutral surfaces).
 * - Legacy generic `brand-*` / `amber-*` Tailwind utilities have been mapped
 *   to `coza-purple-*` / `coza-gold-*` so the page reads consistently on
 *   both the light and dark theme variants without any per-component
 *   hard-coded hex values.
 *
 * BRAND REVAMP (v2.1) — dark theme is no longer monochrome white:
 * - The "Reporting Period" badge now carries a gold border + gold value
 *   text in dark mode, and `AppHeader`'s page title/eyebrow pick up
 *   gold/purple tints (see AppHeader.jsx) — deliberately breaking up an
 *   all-white dark header.
 * - The three `BreakdownChart` instances below are each given an explicit
 *   `accent` ("purple" | "gold" | "emerald") so their header icons, "Load
 *   More" spinners, and chart palettes visually differ from one another
 *   instead of defaulting to the same purple everywhere.
 * ============================================================
 */

import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Loader2,
    PieChart,
    RefreshCw,
    TrendingUp,
} from 'lucide-react';

import '../../../css/analyticsDashboard.css';
import AppLayout from '@/Layouts/AppLayout';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { AnalyticsErrorBoundary } from '@/components/Analytics/AnalyticsErrorBoundary';
import FilterBar from '@/components/Analytics/FilterBar';
import KPIStats from '@/components/Analytics/KPIStats';
import DailyTrendChart from '@/components/Analytics/DailyTrendChart';
import UniqueUsersTrendChart from '@/components/Analytics/UniqueUsersTrendChart';
import BreakdownChart from '@/components/Analytics/BreakdownChart';
import WittyBadge from '@/components/Analytics/WittyBadge';
import UniqueUsersByAssetCard from '@/components/Analytics/UniqueUsersByAssetCard';
import GeoMap from '@/components/Analytics/GeoMap';
import TopSessionsTable from '@/components/Analytics/TopSessionsTable';
import RefreshIndicator from '@/components/Analytics/RefreshIndicator';
import AutoRefreshBanner from '@/components/Analytics/AutoRefreshBanner';
import {
    KpiSkeleton,
    DailyTrendSkeleton,
    BreakdownChartSkeleton,
    UniqueUsersTrendSkeleton,
    UniqueUsersByAssetSkeleton,
    TopSessionsTableSkeleton,
    GeoMapSkeleton
} from '@/components/Analytics/Skeletons';

/**
 * Dashboard Component
 *
 * Renders the primary analytics screen including KPI stat cards, trend timelines,
 * breakdown charts, geographic maps, and top session data tables.
 *
 * @component
 * @returns {React.JSX.Element} Fully configured dashboard page shell.
 */
export default function Dashboard() {
    const { props: pageProps } = usePage();
    const { state, actions } = useDashboardAnalytics(pageProps);

    const hasPrev = state.sessionsOffset > 0;
    const hasNext = state.sessionsOffset + state.sessionsLimit < state.sessionsTotal;
    const showEmptyState =
        !state.loading &&
        state.dashboardIsEmpty &&
        state.refreshStatus !== 'in_progress' &&
        !state.refreshing;

    // Downloads that could not be attributed to a service stay out of the chart
    // (no "Unknown" bar) but are still inside the total-downloads KPI, so say so
    // - only when there is something to report.
    const unattributed = Number(
        state.normalizedDashboardData?.unattributedDownloads ??
        state.normalizedDashboardData?.unattributed_downloads ??
        0
    );
    const unattributedFootnote = unattributed > 0
        ? `${unattributed.toLocaleString()} ${unattributed === 1 ? 'download' : 'downloads'} not attributed to a service`
        : '';

    /**
     * Render full-shell loader during initial data hydration.
     */
    if (!state.dashboardData && state.loading) {
        return (
            <AppLayout isRefreshing>
                <div className="flex min-h-[55vh] items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                        <Loader2 className="size-8 animate-spin text-coza-purple-500" />
                        <span className="text-sm font-medium">Loading analytics…</span>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <>
            <Head title="Analytics Dashboard" />

            <AppLayout
                onRefresh={actions.handleRefresh}
                onExport={actions.handleExport}
                onLogout={actions.handleLogout}
                isRefreshing={state.refreshing}
            >
                <div className="space-y-6">
                    {/* Header: Title and Current Reporting Range */}
                    <section id="overview" className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-coza-purple-500 dark:text-coza-purple-400">
                                Performance Intelligence
                            </p>
                            {/*
                              Hero heading uses the COZA signature purple → gold
                              gradient (`coza-gradient-text`, defined in
                              analyticsDashboard.css §"COZA BRAND HELPERS") to
                              anchor the page's primary brand identity.
                            */}
                            <h2 className="coza-gradient-text mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                                Digital Assets Analytics
                            </h2>
                            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                                Monitor downloads, unique users, asset engagement, sessions and geographic reach.
                            </p>
                        </div>

                        {/* Gold-tinted border + value text keep this "badge" from reading as plain white/gray in dark mode */}
                        <div className="rounded-xl border border-coza-gold-500/60 bg-white px-4 py-3 text-left md:text-right shadow-theme-xs dark:border-coza-gold-500/20 dark:bg-white/3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                                Reporting Period
                            </p>
                            <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-coza-gold-300">
                                {state.debouncedStartDate} <span className="text-gray-400">→</span> {state.debouncedEndDate}
                            </p>
                        </div>
                    </section>

                    {/* Active Refresh Status Notification */}
                    {state.refreshing && (
                        <div className="flex items-center gap-3 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800 dark:border-warning-500/20 dark:bg-warning-500/6 dark:text-warning-200">
                            <Loader2 className="size-4 shrink-0 animate-spin" />
                            <span>
                                Refreshing analytics for <strong>{state.debouncedStartDate}</strong> to{' '}
                                <strong>{state.debouncedEndDate}</strong>…
                            </span>
                        </div>
                    )}

                    {/* Empty State Alert */}
                    {showEmptyState && (
                        <div className="flex flex-col gap-4 rounded-2xl border border-warning-200 bg-warning-50 p-5 dark:border-warning-500/20 dark:bg-warning-500/6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 size-5 shrink-0 text-coza-gold-600 dark:text-coza-gold-400" />
                                <div>
                                    <h3 className="font-semibold text-coza-gold-900 dark:text-coza-gold-200">
                                        No download data is available for the selected period.
                                    </h3>
                                    <p className="mt-1 text-sm text-coza-gold-800/80 dark:text-coza-gold-200/70">
                                        Run a controlled refresh to rebuild the selected period from Google Analytics 4.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={actions.handleRefresh}
                                disabled={state.refreshing}
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-coza-gold-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-coza-gold-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RefreshCw className="size-4" />
                                Refresh Data
                            </button>
                        </div>
                    )}

                    {/* Section 1: KPI Statistics Summary Grid */}
                    {state.loading ? (
                        <KpiSkeleton />
                    ) : (
                        <AnalyticsErrorBoundary title="KPI summary">
                            <KPIStats
                                data={state.normalizedDashboardData}
                                totalUniqueUsers={state.totalUniqueUsers}
                            />
                        </AnalyticsErrorBoundary>
                    )}

                    {/* Section 2: Date and Contextual Filter Controls */}
                    <FilterBar
                        startDate={state.startDate}
                        endDate={state.endDate}
                        onStartDateChange={actions.handleStartDateChange}
                        onEndDateChange={actions.handleEndDateChange}
                        activePreset={state.activePreset}
                        onSelectPreset={actions.handleApplyPreset}
                        serviceType={state.serviceType}
                        onServiceTypeChange={actions.setServiceType}
                        program={state.program}
                        onProgramChange={actions.setProgram}
                        filterOptions={state.filterOptions}
                    />

                    {/* Section 3: Hero Download Volume Timeline */}
                    <div id="hero-trend" className="scroll-mt-24">
                        <AnalyticsErrorBoundary title="Daily Downloads Trend">
                            {state.loading ? (
                                <DailyTrendSkeleton />
                            ) : (
                                <DailyTrendChart data={state.normalizedDashboardData} />
                            )}
                        </AnalyticsErrorBoundary>
                    </div>

                    {/* Section 4: Downloads Breakdown Grid (Asset Type & Service Type) */}
                    <div id="breakdowns" className="grid scroll-mt-24 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                        <AnalyticsErrorBoundary title="Downloads by Asset Type">
                            {state.loading ? (
                                <BreakdownChartSkeleton />
                            ) : (
                                <BreakdownChart
                                    title="Downloads by Asset Type"
                                    icon={PieChart}
                                    type="pie"
                                    accent="purple"
                                    items={state.normalizedDashboardData?.byAssetType?.length ? state.normalizedDashboardData.byAssetType : state.assetItems}
                                    labelKey="asset_type"
                                    valueKey="eventCount"
                                    hasMore={state.assetHasMore}
                                    loadingMore={state.assetLoadingMore}
                                    onLoadMore={actions.loadMoreAsset}
                                />
                            )}
                        </AnalyticsErrorBoundary>

                        <AnalyticsErrorBoundary title="Downloads by Service Type">
                            {state.loading ? (
                                <BreakdownChartSkeleton />
                            ) : (
                                <BreakdownChart
                                    title="Downloads by Service Type"
                                    icon={BarChart3}
                                    type="bar"
                                    accent="gold"
                                    items={state.normalizedDashboardData?.byServiceType?.length ? state.normalizedDashboardData.byServiceType : state.serviceItems}
                                    labelKey="service_type"
                                    valueKey="eventCount"
                                    hasMore={state.serviceHasMore}
                                    loadingMore={state.serviceLoadingMore}
                                    onLoadMore={actions.loadMoreService}
                                    footnote={unattributedFootnote}
                                />
                            )}
                        </AnalyticsErrorBoundary>
                    </div>

                    {/* Section 5: Unique User Intelligence Grid (Daily Unique Users & Unique Users by Asset) */}
                    <div id="unique-user-intelligence" className="grid scroll-mt-24 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                        <AnalyticsErrorBoundary title="Daily Unique Users">
                            {state.loading ? (
                                <UniqueUsersTrendSkeleton />
                            ) : (
                                <UniqueUsersTrendChart data={state.uniqueUsersData} />
                            )}
                        </AnalyticsErrorBoundary>

                        <AnalyticsErrorBoundary title="Unique Users by Asset Type">
                            {state.loading || state.uniqueUsersLoading ? (
                                <UniqueUsersByAssetSkeleton />
                            ) : (
                                <UniqueUsersByAssetCard
                                    title="Unique Users by Asset Type"
                                    items={state.uniqueByAsset}
                                    totalUniqueUsers={state.totalUniqueUsers}
                                />
                            )}
                        </AnalyticsErrorBoundary>
                    </div>

                    {/* Section 6: Geographic User Distribution Map */}
                    <div id="geography" className="scroll-mt-24">
                        <AnalyticsErrorBoundary title="Geographic User Map">
                            {state.loading || state.geoLoading ? (
                                <GeoMapSkeleton />
                            ) : (
                                <GeoMap
                                    data={state.geoData}
                                    title="User Locations by Country"
                                    cartoRegistry={pageProps.cartoRegistry}
                                />
                            )}
                        </AnalyticsErrorBoundary>
                    </div>

                    {/* Section 7: Detailed Sessions Table & Pagination */}
                    <div id="sessions" className="scroll-mt-24">
                        <AnalyticsErrorBoundary title="Top Sessions">
                            {state.sessionsLoading ? (
                                <TopSessionsTableSkeleton rows={state.sessionsLimit} />
                            ) : (
                                <div>
                                    <TopSessionsTable
                                        sessions={state.sessions.length ? state.sessions : state.normalizedDashboardData?.topSessions ?? []}
                                        dailyTrend={state.normalizedDashboardData?.dailyTrend ?? []}
                                        startIndex={state.sessionsOffset}
                                    />

                                    {state.sessionsTotal > state.sessionsLimit && (
                                        <div className="coza-geo-panel mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                Showing {state.sessionsOffset + 1}–
                                                {Math.min(state.sessionsOffset + state.sessionsLimit, state.sessionsTotal)} of{' '}
                                                {state.sessionsTotal}
                                            </span>

                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={actions.handlePreviousPage}
                                                    disabled={!hasPrev}
                                                    className="inline-flex size-9 items-center justify-center rounded-lg border border-coza-purple-200 text-coza-purple-600 transition hover:bg-coza-purple-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-coza-purple-300 dark:hover:bg-white/5"
                                                    aria-label="Previous sessions page"
                                                >
                                                    <ChevronLeft className="size-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={actions.handleNextPage}
                                                    disabled={!hasNext}
                                                    className="inline-flex size-9 items-center justify-center rounded-lg border border-coza-purple-200 text-coza-purple-600 transition hover:bg-coza-purple-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-coza-purple-300 dark:hover:bg-white/5"
                                                    aria-label="Next sessions page"
                                                >
                                                    <ChevronRight className="size-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </AnalyticsErrorBoundary>
                    </div>

                    {/* System Overlay Status Components */}
                    <RefreshIndicator show={state.refreshStatus === 'in_progress'} />
                    <AutoRefreshBanner show={false} />

                    {/* Dashboard Footer
                        BUG FIX: this is a plain <div>, not a <footer> element, so the
                        `.analytics-dashboard-root footer` rule in analyticsDashboard.css
                        never matched it — the purple top border and brand-gradient text
                        requested for the light-mode footer never actually applied. Using
                        `coza-footer-brand` directly here (and a COZA-purple top border)
                        fixes that without relying on the tag selector. */}
                    <div className="border-t border-(--coza-primary-border) pt-6 max-w-7xl mx-auto flex flex-col items-center gap-1.5 text-center text-xs text-gray-400 md:flex-row md:justify-between md:gap-4 md:text-left md:text-sm dark:border-gray-800">
                        <p>
                            <strong className="coza-footer-brand">&copy;</strong> {new Date().getFullYear()} COZA Digital Service Assets{' '}
                            <strong className="text-coza-gold-400 text-sm">&middot;</strong>{' '}
                            <span className="coza-footer-brand">Commonwealth of Zion Assembly</span>{' '}
                            <strong className="text-coza-gold-400 text-sm">&middot;</strong> All rights reserved.
                        </p>
                        <p className="inline-flex flex-wrap items-center justify-center gap-2 md:justify-end">
                            <span>Powered by</span>
                            <WittyBadge className="size-7 sm:size-8 lg:size-9" />
                            <strong className="text-purple-500 text-sm dark:text-purple-400 dark:text-sm">Witty Inventions</strong>
                        </p>
                    </div>

                </div>
            </AppLayout>
        </>
    );
}

/**
 * Inertia layout override.
 * 
 * Returns `page` directly to indicate that this component manages layout wrapping
 * internally via `AppLayout`, avoiding redundant nesting from legacy roots.
 */
Dashboard.layout = (page) => page;