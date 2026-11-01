/**
 * ============================================================
 * KpiSkeleton Component – COZA Analytics Dashboard
 * ============================================================
 *
 * TailAdmin-styled loading skeleton for the KPI statistics grid.
 * Aligns with the skeleton suite pattern (ChartSkeleton, TableSkeleton)[cite: 25, 27]
 * while matching the exact 5-column responsive breakpoints [1, 2, 3, 4, 5], 
 * card padding, and dark-mode aesthetics of the KPIStats component.
 * ============================================================
 */

import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

/**
 * KpiSkeleton Component
 *
 * Renders 5 placeholder cards with animated loading skeletons during async 
 * analytics data hydration. Accommodates sidebar expansion and viewport scaling.
 *
 * @component
 * @returns {JSX.Element} Skeleton loading grid matching KPIStats structure.
 */
export default function KpiSkeleton() {
    return (
        <section
            aria-label="Loading KPI statistics..."
            className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-3.5 2xl:gap-4"
        >
            {Array.from({ length: 5 }).map((_, i) => (
                <article
                    key={`kpi-skeleton-item-${i}`}
                    className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-3.5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3 sm:p-4 2xl:p-5"
                >
                    {/* Top Row Placeholder: Title, Primary Value & Icon Container */}
                    <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1 space-y-2">
                            {/* Card Label Skeleton */}
                            <div className="max-w-25">
                                <Skeleton height={16} width="80%" borderRadius={6} />
                            </div>

                            {/* Card Metric Value Skeleton */}
                            <div className="max-w-30 pt-1">
                                <Skeleton height={28} width="90%" borderRadius={8} />
                            </div>
                        </div>

                        {/* Icon Badge Skeleton */}
                        <div className="shrink-0">
                            <Skeleton circle width={40} height={40} />
                        </div>
                    </div>

                    {/* Bottom Row Placeholder: Context Subtext */}
                    <div className="mt-4 pt-1 max-w-35">
                        <Skeleton height={14} width="100%" borderRadius={4} />
                    </div>
                </article>
            ))}
        </section>
    );
}