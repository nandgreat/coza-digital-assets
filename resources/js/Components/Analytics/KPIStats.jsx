/**
 * ============================================================
 * KPIStats Component – COZA Analytics Dashboard
 * ============================================================
 *
 * TailAdmin-styled KPI summary grid. Features smooth Framer Motion count-up
 * animations, responsive 5-step grid scaling [1, 2, 3, 4, 5], defensive 
 * flex-truncation constraints for long session strings, and full dark-mode support.
 *
 * Icon badges are themed from the COZA royal-purple / gold / emerald brand
 * triad (see the `cards` definition below for the full color rationale).
 *
 * BRAND REVAMP (v2.1): light-mode gradient stops were deepened one step
 * (e.g. `-50 via-white` → `-100 via-*-50/70`) and every border saturated
 * by one step so the five cards read as clearly "branded surfaces" at a
 * glance in light mode, instead of a near-white tint that only shows up
 * on close inspection. Dark-mode values are untouched — they were already
 * working well.
 * ============================================================
 */

import React, { useEffect, useRef } from 'react';
import {
    animate,
    motion,
    useInView,
    useMotionValue,
    useTransform,
} from 'framer-motion';
import {
    CalendarDays,
    Download,
    List,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react';

/**
 * Format raw numeric values into human-scannable metrics with K/M suffixes.
 *
 * @param {number} num - Numeric value to format.
 * @returns {string} Formatted number string (e.g., 1.5K, 2.4M).
 */
const formatNumber = (num) => {
    if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return Math.round(num).toString();
};

/**
 * AnimatedNumber Component Props
 *
 * @typedef {Object} AnimatedNumberProps
 * @property {number} value - Target numeric metric to count up to.
 * @property {function(number): string} [formatter=formatNumber] - Value formatting function.
 * @property {string} [prefix=''] - Optional text prefix (e.g., '+').
 * @property {string} [suffix=''] - Optional text suffix (e.g., '%').
 * @property {number} [duration=1.2] - Animation duration in seconds.
 */

/**
 * AnimatedNumber Sub-Component
 *
 * Animates numeric metrics from zero to the target value using Framer Motion
 * motion values and viewport detection hooks.
 *
 * @component
 * @param {AnimatedNumberProps} props
 * @returns {JSX.Element} Animated motion span element.
 */
function AnimatedNumber({
    value,
    formatter = formatNumber,
    prefix = '',
    suffix = '',
    duration = 1.2,
}) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });
    const count = useMotionValue(0);

    // Transform raw motion count into formatted output string
    const formattedValue = useTransform(count, (latest) => {
        return `${prefix}${formatter(latest)}${suffix}`;
    });

    useEffect(() => {
        if (isInView && typeof value === 'number' && !isNaN(value)) {
            const controls = animate(count, value, {
                duration,
                ease: [0.16, 1, 0.3, 1], // Custom cubic-bezier ease-out curve
            });
            return () => controls.stop();
        }
    }, [isInView, value, count, duration]);

    if (typeof value !== 'number' || isNaN(value)) {
        return <span>{value}</span>;
    }

    return <motion.span ref={ref}>{formattedValue}</motion.span>;
}

/**
 * KPIStats Props
 *
 * @component
 * @param {Object} props
 * @param {Object} props.data - The dashboard analytics object.
 * @param {number} [props.totalUniqueUsers=0] - Total unique users count override.
 * @returns {JSX.Element|null} Rendered KPI card grid or null if data is absent.
 */
export default function KPIStats({ data, totalUniqueUsers = 0 }) {
    if (!data) return null;

    const target = data.data ?? data;
    const totalDownloads = Number(target.totalDownloads ?? target.total_downloads ?? 0);
    const totalChange = Number(target.totalChange ?? target.total_change ?? 0);
    const totalPercent = Number(target.totalPercent ?? target.total_percent ?? 0);
    const dailyTrend = target.dailyTrend ?? target.daily_trend ?? [];
    const topSessions = target.topSessions ?? target.top_sessions ?? [];
    const uniqueUsersVal = totalUniqueUsers || Number(target.totalUniqueUsers ?? target.total_unique_users ?? 0);
    const avgDaily = dailyTrend.length ? Math.round(totalDownloads / dailyTrend.length) : 0;
    const topSession = topSessions.length ? topSessions[0] : null;

    /**
     * Card metadata definition array.
     *
     * COZA BRAND COLOR MAPPING — each card now carries its own gradient
     * "surface" (not just a colored icon) so the five cards read as
     * distinct, premium brand moments rather than five identical white
     * boxes. Every card pairs four coordinated pieces:
     *   - `cardBgClass`  → a soft directional gradient using the card's accent
     *   - `borderClass`  → a matching tinted border (replaces plain gray-200)
     *   - `iconClass`    → a solid-fill icon chip (not soft-tint) for real "pop"
     *   - `glowClass`    → the matching `coza-*-glow` utility, applied on hover
     *
     * `red` remains the one deliberate non-brand exception for the
     * negative "Change vs Previous" state — see inline comment below.
     *
     *   - Total Downloads   → pure Emerald   (growth / volume)
     *   - Change vs Previous→ Purple + a thread of Gold (positive) / Red (negative, semantic)
     *   - Average Daily     → pure Gold      (steady, premium emphasis)
     *   - Top Session       → deep Purple    (stands apart from "Change")
     *   - Unique Users      → Gold→Emerald blend (a distinct 5th "premium growth" look)
     *
     * @type {Array<Object>}
     */
    const cards = [
        {
            label: 'Total Downloads',
            rawNumber: totalDownloads,
            icon: Download,
            cardBgClass: 'bg-gradient-to-br from-coza-emerald-100 via-coza-emerald-50/70 to-white dark:from-coza-emerald-500/15 dark:via-gray-900 dark:to-gray-900',
            borderClass: 'border-coza-emerald-300 dark:border-coza-emerald-500/20',
            iconClass: 'bg-coza-emerald-500 text-white shadow-md shadow-coza-emerald-500/30',
            glowClass: 'hover:coza-emerald-glow',
            descriptionClass: 'text-coza-emerald-700/80 dark:text-coza-emerald-300/70',
            description: 'Selected period',
        },
        {
            label: 'Change vs Previous',
            rawNumber: totalChange,
            prefix: totalChange >= 0 ? '+' : '',
            icon: totalChange >= 0 ? TrendingUp : TrendingDown,
            // Positive change blends purple → a thread of gold, distinguishing it
            // from the pure-purple "Top Session" card below. Negative change
            // intentionally drops the brand palette entirely for red — the one
            // deliberate exception, so a decline is still instantly legible
            // against four purple/gold/emerald-branded neighbors.
            cardBgClass: totalChange >= 0
                ? 'bg-gradient-to-br from-coza-purple-100 via-coza-purple-50/60 to-coza-gold-100/70 dark:from-coza-purple-500/15 dark:via-gray-900 dark:to-coza-gold-500/5'
                : 'bg-gradient-to-br from-red-100 via-red-50/60 to-white dark:from-red-500/15 dark:via-gray-900 dark:to-gray-900',
            borderClass: totalChange >= 0
                ? 'border-coza-purple-300 dark:border-coza-purple-500/20'
                : 'border-red-300 dark:border-red-500/20',
            iconClass: totalChange >= 0
                ? 'bg-coza-purple-500 text-white shadow-md shadow-coza-purple-500/30'
                : 'bg-red-500 text-white shadow-md shadow-red-500/30',
            glowClass: totalChange >= 0 ? 'hover:coza-purple-glow' : '',
            description: `${totalChange >= 0 ? '+' : ''}${totalPercent}% vs previous period`,
            descriptionClass: totalChange >= 0 ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400',
        },
        {
            label: 'Average Daily',
            rawNumber: avgDaily,
            icon: CalendarDays,
            cardBgClass: 'bg-gradient-to-br from-coza-gold-100 via-coza-gold-50/60 to-white dark:from-coza-gold-500/15 dark:via-gray-900 dark:to-gray-900',
            borderClass: 'border-coza-gold-300 dark:border-coza-gold-500/20',
            iconClass: 'bg-coza-gold-500 text-white shadow-md shadow-coza-gold-500/30',
            glowClass: 'hover:coza-gold-glow',
            descriptionClass: 'text-coza-gold-700/80 dark:text-coza-gold-300/70',
            description: 'Average downloads/day',
        },
        {
            label: 'Top Session',
            staticDisplayValue: topSession?.session || 'N/A',
            icon: List,
            // Deeper purple saturation than "Change vs Previous" so the two
            // purple-family cards remain visually distinguishable side by side.
            cardBgClass: 'bg-gradient-to-br from-coza-purple-200 via-coza-purple-100/60 to-white dark:from-coza-purple-500/25 dark:via-gray-900 dark:to-gray-900',
            borderClass: 'border-coza-purple-400 dark:border-coza-purple-500/25',
            iconClass: 'bg-coza-purple-700 text-white shadow-md shadow-coza-purple-700/30',
            glowClass: 'hover:coza-purple-glow',
            descriptionClass: 'text-coza-purple-700/80 dark:text-coza-purple-300/70',
            description: topSession?.eventCount ? `${formatNumber(Number(topSession.eventCount))} downloads` : 'No downloads recorded',
            compact: true,
        },
        {
            label: 'Unique Users',
            rawNumber: uniqueUsersVal,
            icon: Users,
            // A gold→emerald blend gives the fifth card its own distinct
            // "premium growth" identity instead of repeating card 1 or 3.
            cardBgClass: 'bg-gradient-to-br from-coza-gold-200 via-coza-emerald-100/60 to-white dark:from-coza-gold-500/20 dark:via-coza-emerald-500/10 dark:to-gray-900',
            borderClass: 'border-coza-gold-300 dark:border-coza-gold-500/20',
            iconClass: 'bg-gradient-to-br from-coza-gold-500 to-coza-emerald-500 text-white shadow-md shadow-coza-gold-500/30',
            glowClass: 'hover:coza-gold-glow',
            descriptionClass: 'text-coza-gold-700/80 dark:text-coza-gold-300/70',
            description: 'Distinct active users',
        },
    ];

    return (
        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-3.5 2xl:gap-4">
            {cards.map((card) => {
                const Icon = card.icon;

                return (
                    <article
                        key={card.label}
                        className={`flex flex-col justify-between rounded-2xl border p-3.5 shadow-theme-sm transition duration-300 hover:-translate-y-0.5 sm:p-4 2xl:p-5 dark:shadow-theme-xs ${card.cardBgClass} ${card.borderClass} ${card.glowClass}`}
                    >
                        {/* Header Row: Label, Value & Icon Badge */}
                        <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400 2xl:text-sm">
                                    {card.label}
                                </p>

                                <h3
                                    title={
                                        card.staticDisplayValue ||
                                        `${card.prefix || ''}${card.rawNumber}`
                                    }
                                    className={`mt-1 font-bold tracking-tight text-gray-900 dark:text-white/95 ${
                                        card.compact
                                            ? 'truncate text-base sm:text-lg xl:text-base 2xl:text-lg'
                                            : 'text-lg sm:text-xl xl:text-xl 2xl:text-2xl'
                                    }`}
                                >
                                    {card.staticDisplayValue !== undefined ? (
                                        card.staticDisplayValue
                                    ) : (
                                        <AnimatedNumber
                                            value={card.rawNumber}
                                            prefix={card.prefix || ''}
                                            suffix={card.suffix || ''}
                                        />
                                    )}
                                </h3>
                            </div>

                            <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-10 2xl:size-11 ${card.iconClass}`}>
                                <Icon className="size-4 sm:size-5" />
                            </span>
                        </div>

                        {/* Footer Row: Metric Subtext */}
                        <p className={`mt-3 truncate text-[11px] sm:text-xs ${card.descriptionClass || 'text-gray-500 dark:text-gray-400'}`}>
                            {card.description}
                        </p>
                    </article>
                );
            })}
        </section>
    );
}
