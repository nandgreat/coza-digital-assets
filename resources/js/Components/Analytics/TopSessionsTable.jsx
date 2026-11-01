/**
 * ============================================================
 * TopSessionsTable – COZA Analytics Dashboard
 * ============================================================
 *
 * TailAdmin-styled responsive data table. The incoming session data
 * shape and fallback date behaviour remain unchanged.
 *
 * BRAND: header icon and row hover state use the COZA royal-purple
 * accent; column headers use the muted purple-tinted neutral scale
 * (`--color-gray-*` is redefined per-brand in analyticsDashboard.css).
 *
 * BRAND REVAMP (v2.1): table is now a true bordered "grid" (header row
 * tinted to match the card surface, zebra-striped body rows) instead of
 * a borderless plain table.
 *
 * BUG FIX (v2.2): this component previously added its own client-side
 * 10-rows-per-page pager on top of whatever `sessions` array it received.
 * `Dashboard.jsx` already implements *real* server-side pagination for
 * this table — it tracks `sessionsOffset`/`sessionsLimit`/`sessionsTotal`
 * and only ever passes this component the current page's slice, then
 * renders its own Previous/Next + "Showing X–Y of Z" footer below it.
 * The client-side pager here was therefore re-paginating an
 * already-paginated slice, producing two competing, out-of-sync
 * pagination controls stacked on the page. This component now purely
 * renders whichever rows it's given; Dashboard.jsx's footer (now
 * restyled to match the brand) is the single source of pagination.
 * ============================================================
 */

import React, { useMemo } from 'react';
import { List } from 'lucide-react';

/**
 * Format numbers with K/M suffix for compact display.
 *
 * @param {number} num
 * @returns {string}
 */
const formatNumber = (num) => {
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
};

/**
 * TopSessionsTable props.
 *
 * @component
 * @param {Object} props
 * @param {Array} props.sessions - Session records for the current page (already paginated upstream by Dashboard.jsx).
 * @param {Array} [props.dailyTrend=[]] - Fallback trend data for dates.
 * @param {number} [props.startIndex=0] - 0-indexed row offset of `sessions` within the full result set, used only for the "#" column.
 * @returns {JSX.Element}
 */
export default function TopSessionsTable({ sessions = [], dailyTrend = [], startIndex = 0 }) {
    const enrichedSessions = useMemo(() => sessions.map((session) => {
        if (session.date) {
            return session;
        }

        const fallbackDate = dailyTrend.length ? dailyTrend[dailyTrend.length - 1].date : 'N/A';
        return { ...session, date: fallbackDate };
    }), [sessions, dailyTrend]);

    return (
        <section className="analytics-card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <div className="analytics-card-title mb-0">
                        {/* Emerald (not purple) so the icon row across all charts/widgets isn't monochrome */}
                        <List className="size-5 text-coza-emerald-500 dark:text-coza-emerald-400" />
                        Top Sessions
                    </div>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        Highest-volume sessions within the selected period.
                    </p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-white/5 dark:text-gray-400">
                    {enrichedSessions.length} shown
                </span>
            </div>

            {enrichedSessions.length > 0 ? (
                <div className="coza-table-grid-wrapper overflow-x-auto rounded-xl border border-coza-purple-100 dark:border-white/8">
                    <table className="min-w-180 w-full border-collapse text-sm">
                        <thead>
                            <tr className="coza-table-grid-head">
                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">Program</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">Session</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">Date</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider">Downloads</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enrichedSessions.map((item, index) => (
                                <tr
                                    key={`${item.session ?? 'session'}-${startIndex + index}`}
                                    className="coza-table-grid-row"
                                >
                                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{startIndex + index + 1}</td>
                                    <td className="max-w-55 truncate px-3 py-3 font-medium text-gray-900 dark:text-gray-200">
                                        {item.program || 'N/A'}
                                    </td>
                                    <td className="max-w-65 truncate px-3 py-3 text-gray-900 dark:text-gray-300">
                                        {item.session || 'N/A'}
                                    </td>
                                    <td className="px-3 py-3 text-gray-800 dark:text-gray-400">
                                        {item.date || 'N/A'}
                                    </td>
                                    <td className="px-3 py-3 text-right font-semibold text-gray-900 dark:text-glass-primary">
                                        {formatNumber(Number(item.eventCount ?? item.downloads ?? 0))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-600 dark:border-gray-800">
                    No session data available.
                </div>
            )}
        </section>
    );
}
