/**
 * ============================================================
 * BreakdownChartSkeleton Component – COZA Analytics Dashboard
 * ============================================================
 *
 * Loading skeleton for the BreakdownChart component.
 * Aligns with the skeleton suite pattern (KpiSkeleton) while matching 
 * the card padding, header controls, responsive h-72 visual layout, 
 * and dark-mode aesthetics of BreakdownChart.
 * ============================================================
 */

import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

/**
 * BreakdownChartSkeleton Component
 *
 * @component
 * @returns {React.JSX.Element} Skeleton loading placeholder for breakdown charts.
 */
export default function BreakdownChartSkeleton() {
    return (
        <section
            aria-label="Loading breakdown chart data..."
            aria-busy="true"
            className="analytics-card p-4 sm:p-5 dark:border-gray-800 dark:bg-white/3"
        >
            {/* Header: Title & Count Indicator */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Skeleton circle width={20} height={20} />
                    <div className="w-36">
                        <Skeleton height={18} borderRadius={6} />
                    </div>
                </div>
                <div className="w-16">
                    <Skeleton height={14} borderRadius={4} />
                </div>
            </div>

            {/* Visual Chart Container Placeholder (h-72) */}
            <div className="flex h-72 w-full items-end justify-between gap-2.5 rounded-xl border border-gray-100 bg-gray-50/50 px-4 pb-3 pt-6 dark:border-gray-800/60 dark:bg-gray-900/40">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={`breakdown-bar-skeleton-${i}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                        <Skeleton
                            height={`${30 + ((i * 19) % 55)}%`}
                            width="65%"
                            borderRadius={6}
                        />
                        <Skeleton height={10} width="60%" borderRadius={4} />
                    </div>
                ))}
            </div>

            {/* Load More Pagination Button Placeholder */}
            <div className="mt-4 flex justify-center">
                <Skeleton height={32} width={110} borderRadius={8} />
            </div>
        </section>
    );
}