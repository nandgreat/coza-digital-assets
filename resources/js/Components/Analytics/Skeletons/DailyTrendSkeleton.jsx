/**
 * ============================================================
 * DailyTrendSkeleton Component – COZA Analytics Dashboard
 * ============================================================
 *
 * Loading skeleton for the DailyTrendChart component.
 * Aligns with the skeleton suite pattern (KpiSkeleton) while matching 
 * the card padding, header typography subtext layout, h-72 chart height, 
 * and dark-mode aesthetics of DailyTrendChart.
 * ============================================================
 */

import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

/**
 * DailyTrendSkeleton Component
 *
 * @component
 * @returns {React.JSX.Element} Skeleton loading placeholder for the daily trends area chart.
 */
export default function DailyTrendSkeleton() {
    return (
        <section
            aria-label="Loading daily download trend..."
            aria-busy="true"
            className="analytics-card p-4 sm:p-5 dark:border-gray-800 dark:bg-white/3"
        >
            {/* Header: Icon, Title & Context Subtext */}
            <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <Skeleton circle width={20} height={20} />
                        <div className="w-44">
                            <Skeleton height={18} borderRadius={6} />
                        </div>
                    </div>
                    <div className="mt-1.5 w-72">
                        <Skeleton height={12} borderRadius={4} />
                    </div>
                </div>
            </div>

            {/* Simulated Area Chart Container Placeholder (h-72) */}
            <div className="flex h-72 w-full flex-col justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800/60 dark:bg-gray-900/40">
                {/* Simulated Y-Axis Values & Horizontal Grid Lines */}
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`grid-line-skeleton-${i}`} className="flex w-full items-center justify-between opacity-50">
                        <Skeleton height={10} width={28} />
                        <Skeleton height={1} width="92%" />
                    </div>
                ))}

                {/* Simulated X-Axis Date Labels Bar */}
                <div className="flex justify-between pl-8 pt-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton key={`daily-axis-skeleton-${i}`} height={10} width={36} borderRadius={4} />
                    ))}
                </div>
            </div>
        </section>
    );
}