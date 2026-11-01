/**
 * ============================================================
 * UniqueUsersTrendSkeleton Component – COZA Analytics Dashboard
 * ============================================================
 *
 * Loading skeleton for UniqueUsersTrendChart.
 * Matches header typography, subtext layout, h-72 chart canvas height,
 * and dark-mode styling.
 * ============================================================
 */

import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

/**
 * UniqueUsersTrendSkeleton Component
 *
 * @component
 * @returns {React.JSX.Element} Skeleton placeholder for unique users trend chart.
 */
export default function UniqueUsersTrendSkeleton() {
    return (
        <section
            aria-label="Loading unique users trend data..."
            aria-busy="true"
            className="analytics-card p-4 sm:p-5 dark:border-gray-800 dark:bg-white/3"
        >
            {/* Header Title & Context Subtext */}
            <div className="mb-5">
                <div className="flex items-center gap-2">
                    <Skeleton circle width={20} height={20} />
                    <div className="w-40">
                        <Skeleton height={18} borderRadius={6} />
                    </div>
                </div>
                <div className="mt-1.5 max-w-xs">
                    <Skeleton height={12} width="85%" borderRadius={4} />
                </div>
            </div>

            {/* Area Chart Container Placeholder (h-72) */}
            <div className="flex h-72 w-full flex-col justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800/60 dark:bg-gray-900/40">
                <div className="flex w-full items-center justify-between opacity-50">
                    <Skeleton height={10} width={36} />
                    <Skeleton height={1} width="90%" />
                </div>
                <div className="flex w-full items-center justify-between opacity-50">
                    <Skeleton height={10} width={36} />
                    <Skeleton height={1} width="90%" />
                </div>
                <div className="flex w-full items-center justify-between opacity-50">
                    <Skeleton height={10} width={36} />
                    <Skeleton height={1} width="90%" />
                </div>
                <div className="flex w-full items-center justify-between opacity-50">
                    <Skeleton height={10} width={36} />
                    <Skeleton height={1} width="90%" />
                </div>
                {/* Simulated X-Axis Dates Label Bar */}
                <div className="flex justify-between pt-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton key={`trend-axis-skeleton-${i}`} height={10} width={32} borderRadius={4} />
                    ))}
                </div>
            </div>
        </section>
    );
}