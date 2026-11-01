/**
 * ============================================================
 * Analytics Skeletons Module Aggregator – COZA Analytics Dashboard
 * ============================================================
 *
 * Centralizes re-exports for the analytics loading skeleton component suite.
 * Enables clean named import syntax across dashboard pages, layout wrappers,
 * and Inertia deferred loading containers.
 * ============================================================
 *
 * @module Components/Analytics/Skeletons
 */

/**
 * Loading skeleton placeholder for the primary KPI statistics grid.
 * Replicates the responsive 5-column layout, card padding, and metric value shapes.
 * 
 * @type {React.ComponentType}
 * @see {@link ./KpiSkeleton}
 */
export { default as KpiSkeleton } from './KpiSkeleton';

/**
 * Loading skeleton placeholder for the daily download time series chart.
 * Replicates chart header typography, subtext, h-72 area canvas, and grid lines.
 * 
 * @type {React.ComponentType}
 * @see {@link ./DailyTrendSkeleton}
 */
export { default as DailyTrendSkeleton } from './DailyTrendSkeleton';

/**
 * Loading skeleton placeholder for breakdown distribution bar charts.
 * Replicates header metrics, animated category bars, and load-more controls.
 * 
 * @type {React.ComponentType}
 * @see {@link ./BreakdownChartSkeleton}
 */
export { default as BreakdownChartSkeleton } from './BreakdownChartSkeleton';

/**
 * Loading skeleton placeholder for unique user trend timeline charts.
 * Replicates title subtext, area chart height, and horizontal grid axis markers.
 * 
 * @type {React.ComponentType}
 * @see {@link ./UniqueUsersTrendSkeleton}
 */
export { default as UniqueUsersTrendSkeleton } from './UniqueUsersTrendSkeleton';

/**
 * Loading skeleton placeholder for the top sessions data table.
 * Replicates table headers, multi-column row alignments, and badge indicators.
 * 
 * @type {React.ComponentType}
 * @see {@link ./TopSessionsTableSkeleton}
 */
export { default as TopSessionsTableSkeleton } from './TopSessionsTableSkeleton';

/**
 * Loading skeleton placeholder for geographic map breakdowns.
 * Replicates control toolbar buttons, search fields, and country grid cards.
 * 
 * @type {React.ComponentType}
 * @see {@link ./GeoMapSkeleton}
 */
export { default as GeoMapSkeleton } from './GeoMapSkeleton';

/**
 * Loading skeleton placeholder for the unique users by asset type card.
 * Replicates header count, de-duplicated total strip, progress-bar rows,
 * and the "shares can exceed 100%" callout.
 * 
 * @type {React.ComponentType}
 * @see {@link ./UniqueUsersByAssetSkeleton}
 */
export { default as UniqueUsersByAssetSkeleton } from './UniqueUsersByAssetSkeleton';