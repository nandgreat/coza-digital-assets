/**
 * ============================================================
 * TopSessionsTableSkeleton Component – COZA Analytics Dashboard
 * ============================================================
 *
 * Loading skeleton for TopSessionsTable component.
 * Replicates table columns (#, Program, Session, Date, Downloads), 
 * header subtext, right-hand pill badge, and cell padding (px-3 py-3).
 * ============================================================
 */

import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

/**
 * TopSessionsTableSkeleton Component
 *
 * @component
 * @param {Object} props
 * @param {number} [props.rows=5] - Number of table row placeholders to render.
 * @returns {React.JSX.Element} Skeleton loading grid for top sessions.
 */
export default function TopSessionsTableSkeleton({ rows = 5 }) {
    return (
        <section
            aria-label="Loading top sessions statistics..."
            aria-busy="true"
            className="analytics-card p-4 sm:p-5 dark:border-gray-800 dark:bg-white/3"
        >
            {/* Header: Title, Subtext & Record Badge */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <Skeleton circle width={20} height={20} />
                        <div className="w-32">
                            <Skeleton height={18} borderRadius={6} />
                        </div>
                    </div>
                    <div className="mt-1.5 w-60">
                        <Skeleton height={12} borderRadius={4} />
                    </div>
                </div>
                <div className="w-20">
                    <Skeleton height={24} borderRadius={9999} />
                </div>
            </div>

            {/* Responsive Data Table */}
            <div className="overflow-x-auto">
                <table className="analytics-table w-full min-w-180">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                            <th className="w-12 px-3 py-3 text-left"><Skeleton height={12} width={16} /></th>
                            <th className="w-48 px-3 py-3 text-left"><Skeleton height={12} width={70} /></th>
                            <th className="px-3 py-3 text-left"><Skeleton height={12} width={80} /></th>
                            <th className="w-28 px-3 py-3 text-left"><Skeleton height={12} width={50} /></th>
                            <th className="w-24 px-3 py-3 text-right"><Skeleton height={12} width={65} /></th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rows }).map((_, i) => (
                            <tr key={`session-row-skeleton-${i}`} className="border-b border-gray-50 dark:border-gray-800/40">
                                <td className="px-3 py-3"><Skeleton height={14} width={16} /></td>
                                <td className="px-3 py-3"><Skeleton height={14} width="85%" borderRadius={4} /></td>
                                <td className="px-3 py-3"><Skeleton height={14} width="90%" borderRadius={4} /></td>
                                <td className="px-3 py-3"><Skeleton height={14} width={70} borderRadius={4} /></td>
                                <td className="px-3 py-3 text-right"><Skeleton height={14} width="60%" borderRadius={4} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}