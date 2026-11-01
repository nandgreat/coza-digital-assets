/**
 * ============================================================
 * BreakdownChart Component – COZA Analytics Dashboard
 * ============================================================
 *
 * Reusable TailAdmin/ApexCharts breakdown visualizer for pie and bar layouts.
 * Features dark-mode theme synchronization, dynamic chart colors, and responsive
 * typography adjustments.
 * ============================================================
 */

import React, { useMemo, useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useTheme } from '@/Contexts/ThemeContext';
import { Info, Users } from 'lucide-react';

/**
 * Shared palette used across chart segments.
 *
 * COZA BRAND PALETTE — sourced directly from the `--color-coza-purple-*`,
 * `--color-coza-gold-*`, and `--color-coza-emerald-*` scales in
 * `analyticsDashboard.css` so every pie/bar segment stays on-brand. Hues
 * are interleaved (purple → gold → emerald, repeating in progressively
 * lighter/darker steps) so adjacent segments stay visually distinct even
 * with the reduced 3-color-family constraint, and remain legible on both
 * the light and dark card surfaces.
 *
 * @type {string[]}
 */
const COLORS = [
    '#7a3ff0', // coza-purple-600
    '#e9ad2c', // coza-gold-500
    '#10b981', // coza-emerald-500
    '#a875ff', // coza-purple-400
    '#ffd052', // coza-gold-300
    '#34d399', // coza-emerald-400
    '#5520b5', // coza-purple-800
    '#b87516', // coza-gold-700
    '#047857', // coza-emerald-700
    '#c09cff', // coza-purple-300
];

/**
 * Index into `COLORS` where each accent's "home" hue begins, so rotating
 * the palette to start there makes the chart's dominant/first segment
 * visually match the header icon's accent color.
 *
 * @type {Readonly<Record<'purple' | 'gold' | 'emerald', number>>}
 */
const ACCENT_START_INDEX = Object.freeze({
    purple: 0, // '#7a3ff0'
    gold: 1,   // '#e9ad2c'
    emerald: 2, // '#10b981'
});

/**
 * Returns `COLORS` rotated so index `startIndex` becomes the first entry,
 * preserving the interleaved purple/gold/emerald ordering for the rest of
 * the segments.
 *
 * @param {number} startIndex - Rotation offset into `COLORS`.
 * @returns {string[]} Rotated copy of the palette.
 */
const rotatePalette = (startIndex) => [
    ...COLORS.slice(startIndex),
    ...COLORS.slice(0, startIndex),
];

/**
 * Icon accent color classes, keyed by the `accent` prop. Lets Dashboard.jsx
 * assign a different COZA brand hue to each BreakdownChart instance (e.g.
 * "Downloads by Asset Type" vs "Downloads by Service Type") so the row of
 * chart icons reads as intentionally varied rather than uniformly purple.
 *
 * @type {Readonly<Record<'purple' | 'gold' | 'emerald', string>>}
 */
const ACCENT_ICON_CLASS = Object.freeze({
    purple: 'text-coza-purple-500 dark:text-coza-purple-400',
    gold: 'text-coza-gold-600 dark:text-coza-gold-400',
    emerald: 'text-coza-emerald-500 dark:text-coza-emerald-400',
});

/**
 * BreakdownChart Component
 *
 * @component
 * @param {Object} props
 * @param {string} props.title - Card title header.
 * @param {React.ElementType} [props.icon] - Lucide header icon.
 * @param {('pie'|'bar')} props.type - Visual chart variant.
 * @param {Array<Object>} [props.items=[]] - Dataset array.
 * @param {string} props.labelKey - Data key name for labels.
 * @param {string} props.valueKey - Data key name for values.
 * @param {boolean} [props.hasMore=false] - Pagination availability flag.
 * @param {boolean} [props.loadingMore=false] - Active pagination loader state.
 * @param {Function} [props.onLoadMore] - Load more pagination callback.
 * @param {string} [props.footnote] - Optional small note under the chart (e.g. downloads that could not be
 *   attributed to a service). Rendered only when non-empty.
 * @param {('purple'|'gold'|'emerald')} [props.accent='purple'] - COZA brand
 *   hue for this instance's header icon and "Load More" spinner, so multiple
 *   BreakdownChart cards on the same page can each stand out differently.
 * @returns {React.JSX.Element} TailAdmin-styled analytics card with ApexCharts instance.
 */
export default function BreakdownChart({
    title,
    icon: Icon,
    type,
    items = [],
    labelKey,
    valueKey,
    hasMore = false,
    loadingMore = false,
    onLoadMore,
    accent = 'purple',
    footnote = '',
}) {
    // Resolve the requested accent to its Tailwind classes, falling back to
    // purple for any unrecognized value so a typo never renders unstyled.
    const accentIconClass = ACCENT_ICON_CLASS[accent] || ACCENT_ICON_CLASS.purple;

    // Sync chart theme state dynamically with application ThemeContext & DOM class state
    const { theme } = useTheme?.() || { theme: 'light' };
    const [isDark, setIsDark] = useState(() => {
        if (theme === 'dark') return true;
        if (typeof document !== 'undefined') {
            return document.documentElement.classList.contains('dark');
        }
        return false;
    });

    // Observe DOM root class mutations to guarantee instantaneous ApexCharts theme sync
    useEffect(() => {
        setIsDark(theme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')));

        if (typeof document === 'undefined') return;

        const observer = new MutationObserver(() => {
            const hasDarkClass = document.documentElement.classList.contains('dark');
            setIsDark(theme === 'dark' || hasDarkClass);
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, [theme]);

    const labels = useMemo(() => items.map((item) => item[labelKey] || 'Unknown'), [items, labelKey]);
    const values = useMemo(() => items.map((item) => Number(item[valueKey] || 0)), [items, valueKey]);

    const pieSeries = useMemo(() => values, [values]);
    const barSeries = useMemo(() => [{ name: title, data: values }], [title, values]);

    /**
     * Dynamically compute ApexCharts options synchronized with theme state.
     *
     * `textColor`/`borderColor` are pinned to the exact `--coza-text-secondary`
     * and `--coza-border` hex values from analyticsDashboard.css (ApexCharts'
     * SVG renderer cannot reliably consume `var(--...)` inside its own theme
     * config, so the literal values are mirrored here instead).
     */
    const options = useMemo(() => {
        const textColor = isDark ? '#d5cfdd' : '#5b5266';
        const borderColor = isDark ? 'rgba(255, 255, 255, 0.09)' : '#e5e1eb';

        return {
            chart: {
                type,
                toolbar: { show: false },
                fontFamily: 'Outfit, sans-serif',
                background: 'transparent',
                foreColor: textColor,
            },
            theme: {
                mode: isDark ? 'dark' : 'light',
            },
            colors: rotatePalette(ACCENT_START_INDEX[accent] ?? 0).slice(0, Math.max(items.length, 1)),
            dataLabels: {
                enabled: type === 'pie',
                style: {
                    fontSize: '11px',
                    fontFamily: 'Outfit, sans-serif',
                },
                dropShadow: { enabled: false },
            },
            labels,
            legend: type === 'pie'
                ? {
                    position: 'bottom',
                    fontSize: '11px',
                    fontFamily: 'Outfit, sans-serif',
                    labels: { colors: textColor },
                    markers: {
                        size: 7,
                        offsetX: -2,
                        offsetY: 0,
                    },
                    itemMargin: { horizontal: 10, vertical: 6 },
                }
                : { show: false },
            plotOptions: {
                bar: {
                    borderRadius: 5,
                    columnWidth: '52%',
                    distributed: true,
                },
                pie: {
                    donut: {
                        size: '62%',
                    },
                },
            },
            grid: {
                borderColor,
                strokeDashArray: 4,
            },
            xaxis: {
                categories: labels,
                labels: {
                    rotate: -35,
                    style: { colors: textColor, fontSize: '10px' },
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
            },
            yaxis: {
                min: 0,
                labels: {
                    style: { colors: textColor, fontSize: '11px' },
                    formatter: (value) => Number(value).toLocaleString(),
                },
            },
            tooltip: {
                theme: isDark ? 'dark' : 'light',
                y: {
                    formatter: (value) => Number(value).toLocaleString(),
                },
            },
            stroke: {
                show: true,
                colors: isDark ? ['#1E293B'] : ['#FFFFFF'],
                width: type === 'pie' ? 2 : 0,
            },
        };
    }, [items.length, labels, type, isDark, title, accent]);

    return (
        <section className="analytics-card p-4 sm:p-5 dark:border-gray-800 dark:bg-white/3">
            {/* Header Title & Item Count */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="analytics-card-title mb-0 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white/95">
                    {Icon && <Icon className={`size-5 ${accentIconClass}`} />}
                    <span>{title}</span>
                </div>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                    {items.length} shown
                </span>
            </div>

            {/* Responsive Chart Container */}
            <div className="h-72 w-full coza-pie-legend-fix">
                {items.length > 0 ? (
                    <Chart
                        type={type}
                        height="100%"
                        width="100%"
                        options={options}
                        series={type === 'pie' ? pieSeries : barSeries}
                    />
                ) : (
                    <div className="analytics-chart-placeholder flex h-full items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                        No breakdown data available.
                    </div>
                )}
            </div>

            {/* Optional reconciliation footnote */}
            {footnote && (
                <p className="mt-3 flex items-start gap-3 rounded-xl border border-coza-gold-400/40 border-l-4 border-l-coza-gold-500 bg-coza-gold-50/80 px-3.5 py-3 shadow-xs dark:border-coza-gold-400/20 dark:border-l-coza-gold-400 dark:bg-coza-gold-500/10" role="note">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-coza-gold-400/25 text-coza-gold-700 dark:bg-coza-gold-400/20 dark:text-coza-gold-300">
                        <Info className="size-4" />
                    </span>
                    <p className="text-center text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                        <span className="block text-[13px] font-semibold text-coza-gold-700 dark:text-coza-gold-300">
                            {footnote}
                        </span>
                    </p>
                </p>
            )}

            {/* Load More Pagination Control */}
            {hasMore && (
                <div className="mt-4 flex justify-center">
                    <button
                        type="button"
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        className="analytics-btn-load-more rounded-lg border border-gray-200 bg-white px-3 py-1.5 shadow-theme-xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                    >
                        {loadingMore ? (
                            <Loader2 className={`size-4 animate-spin ${accentIconClass}`} />
                        ) : (
                            <ChevronDown className="size-4" />
                        )}
                        <span>{loadingMore ? 'Loading…' : 'Load More'}</span>
                    </button>
                </div>
            )}
        </section>
    );
}
