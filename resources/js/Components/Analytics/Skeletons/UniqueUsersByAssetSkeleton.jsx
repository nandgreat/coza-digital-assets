/**
 * ============================================================
 * UniqueUsersByAssetSkeleton Component – COZA Analytics Dashboard
 * ============================================================
 *
 * Loading skeleton for UniqueUsersByAssetCard.
 * Aligns with the skeleton suite pattern (KpiSkeleton) while matching
 * the card header (icon, title, "N shown" count), the de-duplicated
 * total strip, the horizontal progress-bar rows (min-h-[13rem]) and
 * the gold "shares can exceed 100%" callout of UniqueUsersByAssetCard.
 * ============================================================
 */

import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

/**
 * Varying label / value widths keep the placeholder rows from looking
 * like a uniform block, mirroring real asset names and counts.
 */
const ROW_SHAPES = [
    { label: '36%', value: 64, bar: '92%' },
    { label: '48%', value: 56, bar: '68%' },
    { label: '30%', value: 60, bar: '44%' },
    { label: '42%', value: 52, bar: '26%' },
];

/**
 * UniqueUsersByAssetSkeleton Component
 *
 * @component
 * @returns {React.JSX.Element} Skeleton loading placeholder for the unique users by asset type card.
 */
export default function UniqueUsersByAssetSkeleton() {
    return (
        <section
            aria-label="Loading unique users by asset type..."
            aria-busy="true"
            className="analytics-card p-4 sm:p-5 dark:border-gray-800 dark:bg-white/3"
        >
            {/* Header: Icon, Title & "N shown" Count Indicator */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Skeleton circle width={20} height={20} />
                    <div className="w-44">
                        <Skeleton height={18} borderRadius={6} />
                    </div>
                </div>
                <div className="w-14">
                    <Skeleton height={12} borderRadius={4} />
                </div>
            </div>

            {/* Overall De-duplicated Unique Users Strip */}
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
                <div className="w-48 max-w-[60%]">
                    <Skeleton height={12} borderRadius={4} />
                </div>
                <div className="w-16">
                    <Skeleton height={22} borderRadius={6} />
                </div>
            </div>

            {/* Per-Asset Progress Bar Rows (min-h-[13rem]) */}
            <div className="min-h-[13rem]">
                <ul className="space-y-4">
                    {ROW_SHAPES.map((shape, i) => (
                        <li key={`unique-asset-row-skeleton-${i}`}>
                            <div className="mb-1.5 flex items-center justify-between gap-3">
                                <div style={{ width: shape.label }}>
                                    <Skeleton height={14} borderRadius={4} />
                                </div>
                                <Skeleton height={12} width={shape.value} borderRadius={4} />
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                                <div style={{ width: shape.bar }} className="h-full">
                                    <Skeleton height={10} borderRadius={9999} className="block" />
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Callout Placeholder: "Shares can add up to more than 100%" */}
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-gray-100 border-l-4 border-l-gray-200 bg-gray-50/70 px-3.5 py-3 dark:border-white/10 dark:border-l-white/15 dark:bg-white/5">
                <Skeleton circle width={28} height={28} />
                <div className="min-w-0 flex-1">
                    <div className="w-3/5">
                        <Skeleton height={13} borderRadius={4} />
                    </div>
                    <div className="mt-1.5">
                        <Skeleton height={10} borderRadius={4} count={2} />
                    </div>
                </div>
            </div>
        </section>
    );
}