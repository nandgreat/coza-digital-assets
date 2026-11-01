/**
 * ============================================================
 * GeoMapSkeleton Component – COZA Analytics Dashboard
 * ============================================================
 *
 * Loading skeleton for GeoMap location breakdown.
 * Replicates the multi-button control bar, search field placeholder, 
 * touch container viewport height (`min-h-75 sm:min-h-95`), and 
 * initial card grid layout.
 * ============================================================
 */

import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

/**
 * GeoMapSkeleton Component
 *
 * @component
 * @param {Object} props
 * @param {number} [props.cards=6] - Number of territory card placeholders to render.
 * @returns {React.JSX.Element} Skeleton loading grid matching GeoMap structure.
 */
export default function GeoMapSkeleton({ cards = 6 }) {
    return (
        <section
            aria-label="Loading geographic user locations..."
            aria-busy="true"
            className="analytics-card flex flex-col justify-between p-4 sm:p-5 dark:border-gray-800 dark:bg-white/3"
        >
            {/* Header & Controls Toolbar Skeleton */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Skeleton circle width={20} height={20} />
                        <div className="w-44">
                            <Skeleton height={18} borderRadius={6} />
                        </div>
                    </div>
                    <div className="mt-1.5 w-64">
                        <Skeleton height={12} borderRadius={4} />
                    </div>
                </div>

                {/* Right Action Control Elements */}
                <div className="flex flex-wrap items-center gap-2">
                    <Skeleton height={32} width={96} borderRadius={8} />
                    <Skeleton height={32} width={140} borderRadius={8} />
                    <Skeleton height={32} width={84} borderRadius={8} />
                    <Skeleton height={24} width={100} borderRadius={6} />
                </div>
            </div>

            {/* Spatial & Grid Body Container (min-h-75 sm:min-h-95) */}
            <div className="relative min-h-75 w-full overflow-hidden rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800/80 dark:bg-gray-950/40 sm:min-h-95">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: cards }).map((_, i) => (
                        <div
                            key={`geomap-card-skeleton-${i}`}
                            className="flex min-h-11 items-center justify-between rounded-lg border border-gray-200/80 bg-white p-3 dark:border-gray-800 dark:bg-gray-900/80"
                        >
                            <div className="min-w-0 flex-1 space-y-2 pr-2">
                                <div className="flex items-center gap-2">
                                    <Skeleton height={12} width={16} />
                                    <Skeleton circle width={16} height={12} />
                                    <div className="w-24">
                                        <Skeleton height={14} borderRadius={4} />
                                    </div>
                                </div>
                                <Skeleton height={6} width="100%" borderRadius={9999} />
                            </div>
                            <div className="w-14 space-y-1 text-right">
                                <Skeleton height={14} width="100%" borderRadius={4} />
                                <Skeleton height={10} width="70%" borderRadius={4} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Show All / Expand Control Button Skeleton */}
            <div className="mt-4 flex justify-center">
                <Skeleton height={32} width={120} borderRadius={8} />
            </div>
        </section>
    );
}