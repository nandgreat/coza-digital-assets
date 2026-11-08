/**
 * ============================================================
 * UniqueUsersByAssetCard – COZA Analytics Dashboard
 * ============================================================
 *
 * Horizontal bars for "Unique Users by Asset Type".
 *
 * Why bars and not a pie: one person can download several asset types, so the
 * per-asset unique-user counts overlap and their shares legitimately add up to
 * more than 100%. A pie implies slices of one whole, which would be misleading.
 *
 * Each row shows the asset's unique users and its share of ALL unique users
 * (the same de-duplicated figure as the Unique Users KPI card), so this card
 * can never disagree with the KPI.
 * ============================================================
 */

import React, { useMemo } from 'react';
import { Info, Users } from 'lucide-react';

/** COZA brand hues, interleaved so neighbouring bars stay distinct. */
const BAR_COLORS = ['#10b981', '#a2713a', '#e9ad2c', '#34d399', '#c39656', '#ffd052'];

const formatPercent = (value) => `${value >= 10 ? Math.round(value) : value.toFixed(1)}%`;

/**
 * @param {Object} props
 * @param {Array<{asset_type: string, activeUsers: number}>} props.items - Per-asset unique users (already named, > 0).
 * @param {number} props.totalUniqueUsers - Overall de-duplicated unique users (the KPI figure).
 * @param {string} [props.title]
 */
export default function UniqueUsersByAssetCard({
    items = [],
    totalUniqueUsers = 0,
    title = 'Unique Users by Asset Type',
}) {
    const rows = useMemo(() => {
        const sorted = [...items].sort((a, b) => Number(b.activeUsers) - Number(a.activeUsers));
        const highest = sorted.length ? Number(sorted[0].activeUsers) : 0;
        // A single asset can never have more users than everyone, so if the
        // overall figure is lower (or missing) fall back to the largest asset.
        const denominator = Math.max(Number(totalUniqueUsers) || 0, highest, 1);

        return sorted.map((item, index) => {
            const users = Number(item.activeUsers) || 0;
            const share = (users / denominator) * 100;

            return {
                label: item.asset_type,
                users,
                share,
                color: BAR_COLORS[index % BAR_COLORS.length],
            };
        });
    }, [items, totalUniqueUsers]);

    return (
        <section className="analytics-card p-4 sm:p-5 dark:border-gray-800 dark:bg-white/3">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="analytics-card-title mb-0 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-glass-primary">
                    <Users className="size-5 text-coza-emerald-500 dark:text-coza-emerald-400" />
                    <span>{title}</span>
                </div>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                    {rows.length} shown
                </span>
            </div>

            {/* Overall de-duplicated figure — same source as the Unique Users KPI */}
            <div className="mb-4 flex items-baseline justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    All unique users (de-duplicated)
                </span>
                <span className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white" data-testid="unique-users-total">
                    {Number(totalUniqueUsers || 0).toLocaleString()}
                </span>
            </div>

            <div className="min-h-52">
                {rows.length > 0 ? (
                    <ul className="space-y-4">
                        {rows.map((row) => (
                            <li key={row.label}>
                                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                                    <span className="font-medium text-gray-800 dark:text-gray-100">{row.label}</span>
                                    <span className="tabular-nums text-gray-600 dark:text-gray-300">
                                        {row.users.toLocaleString()}
                                        <span className="ml-2 text-xs font-semibold text-gray-400 dark:text-gray-500">
                                            {formatPercent(row.share)}
                                        </span>
                                    </span>
                                </div>
                                <div
                                    className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10"
                                    role="progressbar"
                                    aria-label={`${row.label}: ${row.users} unique users`}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={Math.min(100, Math.round(row.share))}
                                >
                                    <div
                                        className="h-full rounded-full transition-[width] duration-500"
                                        style={{ width: `${Math.max(2, Math.min(100, row.share))}%`, backgroundColor: row.color }}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="analytics-chart-placeholder flex h-48 items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                        No breakdown data available.
                    </div>
                )}
            </div>

            {/* Callout: explains why the shares can exceed 100% */}
            <div
                className="mt-5 flex items-start gap-3 rounded-xl border border-coza-gold-400/40 border-l-4 border-l-coza-gold-500 bg-coza-gold-50/80 px-3.5 py-3 shadow-xs dark:border-coza-gold-400/20 dark:border-l-coza-gold-400 dark:bg-coza-gold-500/10"
                role="note"
            >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-coza-gold-400/25 text-coza-gold-700 dark:bg-coza-gold-400/20 dark:text-coza-gold-300">
                    <Info className="size-4" />
                </span>
                <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                    <span className="block text-[13px] font-semibold text-coza-gold-700 dark:text-coza-gold-300">
                        Shares can add up to more than 100%
                    </span>
                    Users can download <strong className="font-semibold text-gray-900 dark:text-white">more than one asset type</strong>,
                    so each person is counted under every asset they downloaded.
                </p>
            </div>
        </section>
    );
}
