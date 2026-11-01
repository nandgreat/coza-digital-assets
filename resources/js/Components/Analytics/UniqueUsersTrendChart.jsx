/**
 * ============================================================
 * UniqueUsersTrendChart Component – COZA Analytics Dashboard
 * ============================================================
 *
 * Renders daily unique users using the TailAdmin/ApexCharts style.
 * The component accepts the same array shape used by the current
 * analytics hook, preventing any backend or data-contract change.
 *
 * BRAND: uses the COZA Royal Purple token — the dashboard's primary
 * brand identity color — and reacts to the active theme so gridlines,
 * axis text, and the tooltip stay legible in dark mode.
 * ============================================================
 */

import React, { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { Users } from 'lucide-react';
import { useTheme } from '@/Contexts/ThemeContext';

/**
 * UniqueUsersTrendChart props.
 *
 * @component
 * @param {Object} props
 * @param {Array} [props.data=[]] - Array of { date, uniqueUsers } records.
 * @returns {JSX.Element}
 */
export default function UniqueUsersTrendChart({ data = [] }) {
    // Sync chart theme state with the application ThemeContext & DOM class,
    // mirroring the same pattern used by BreakdownChart/DailyTrendChart for
    // a consistent dark/light experience across every ApexCharts instance.
    const { theme } = useTheme?.() || { theme: 'light' };
    const [isDark, setIsDark] = useState(() => {
        if (theme === 'dark') return true;
        if (typeof document !== 'undefined') {
            return document.documentElement.classList.contains('dark');
        }
        return false;
    });

    useEffect(() => {
        setIsDark(theme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')));

        if (typeof document === 'undefined') return;

        const observer = new MutationObserver(() => {
            setIsDark(theme === 'dark' || document.documentElement.classList.contains('dark'));
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, [theme]);

    const series = useMemo(() => [
        {
            name: 'Unique Users',
            data: data.map((item) => Number(item.uniqueUsers ?? item.unique_users ?? 0)),
        },
    ], [data]);

    /**
     * Chart option colors are pinned to the exact COZA design-token hex
     * values (`--coza-primary`, `--coza-text-secondary`, `--coza-border`)
     * rather than referencing the CSS variables directly, since ApexCharts'
     * SVG renderer does not reliably resolve `var(--...)` at draw time.
     */
    const options = useMemo(() => {
        const purple = isDark ? '#a875ff' : '#7a3ff0'; // --coza-primary (dark / light)
        const textColor = isDark ? '#d5cfdd' : '#5b5266'; // --coza-text-secondary
        const borderColor = isDark ? 'rgba(255, 255, 255, 0.09)' : '#e5e1eb'; // --coza-border

        return {
            chart: {
                type: 'area',
                toolbar: { show: false },
                zoom: { enabled: false },
                fontFamily: 'Outfit, sans-serif',
                background: 'transparent',
                foreColor: textColor,
            },
            colors: [purple],
            dataLabels: { enabled: false },
            stroke: {
                curve: 'smooth',
                width: 2.5,
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: isDark ? 0.24 : 0.20,
                    opacityTo: 0.03,
                    stops: [0, 90, 100],
                },
            },
            grid: {
                borderColor,
                strokeDashArray: 4,
            },
            xaxis: {
                categories: data.map((item) => item.date),
                labels: {
                    style: {
                        colors: textColor,
                        fontSize: '11px',
                    },
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
            },
            yaxis: {
                min: 0,
                labels: {
                    style: {
                        colors: textColor,
                        fontSize: '11px',
                    },
                    formatter: (value) => Number(value).toLocaleString(),
                },
            },
            tooltip: {
                theme: isDark ? 'dark' : 'light',
                y: {
                    formatter: (value) => Number(value).toLocaleString(),
                },
            },
            legend: { show: false },
        };
    }, [data, isDark]);

    return (
        <section className="analytics-card p-4 sm:p-5">
            <div className="mb-5">
                <div className="analytics-card-title mb-0">
                    {/* Royal purple icon ties this chart back to the primary brand identity */}
                    <Users className="size-5 text-coza-purple-500 dark:text-coza-purple-400" />
                    Daily Unique Users
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Distinct users recorded per day in the selected period.
                </p>
            </div>

            <div className="h-72">
                {data.length > 0 ? (
                    <Chart type="area" height="100%" options={options} series={series} />
                ) : (
                    <div className="analytics-chart-placeholder">No unique users data available.</div>
                )}
            </div>
        </section>
    );
}
