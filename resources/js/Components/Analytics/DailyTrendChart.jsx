/**
 * ============================================================
 * DailyTrendChart Component – COZA Analytics Dashboard
 * ============================================================
 *
 * Renders the existing daily download time series using ApexCharts,
 * matching the TailAdmin analytics visual system. The incoming data
 * contract remains unchanged from the legacy Chart.js implementation.
 *
 * BRAND: the trend line/fill uses the COZA Emerald token (growth &
 * positive-momentum semantics) and reacts to the active dashboard theme
 * so gridlines, axis text, and the tooltip all stay legible in dark mode.
 * ============================================================
 */

import React, { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { TrendingUp } from 'lucide-react';
import { useTheme } from '@/Contexts/ThemeContext';

/**
 * DailyTrendChart props.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.data - The dashboard data object.
 * @returns {JSX.Element}
 */
export default function DailyTrendChart({ data }) {
    const dailyTrend = data?.dailyTrend ?? data?.daily_trend ?? [];

    // Sync chart theme state with the application ThemeContext & DOM class,
    // mirroring the same pattern used by BreakdownChart for a consistent
    // dark/light experience across every ApexCharts instance.
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
            name: 'Downloads',
            data: dailyTrend.map((item) => Number(item.eventCount ?? item.downloads ?? 0)),
        },
    ], [dailyTrend]);

    /**
     * Chart option colors are pinned to the exact COZA design-token hex
     * values (`--coza-emerald`, `--coza-text-secondary`, `--coza-border`)
     * rather than referencing the CSS variables directly, since ApexCharts'
     * SVG renderer does not reliably resolve `var(--...)` at draw time.
     */
    const options = useMemo(() => {
        const emerald = isDark ? '#34d399' : '#10b981'; // --coza-emerald (dark / light)
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
            colors: [emerald],
            dataLabels: { enabled: false },
            stroke: {
                curve: 'smooth',
                width: 2.5,
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: isDark ? 0.28 : 0.24,
                    opacityTo: 0.03,
                    stops: [0, 90, 100],
                },
            },
            grid: {
                borderColor,
                strokeDashArray: 4,
            },
            xaxis: {
                categories: dailyTrend.map((item) => item.date),
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
    }, [dailyTrend, isDark]);

    return (
        <section className="analytics-card p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                    <div className="analytics-card-title mb-0">
                        {/* Emerald icon reinforces the "growth" semantic of a downloads trend */}
                        <TrendingUp className="size-5 text-coza-emerald-500 dark:text-coza-emerald-400" />
                        Daily Downloads Trend
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Daily download activity within the selected reporting period.
                    </p>
                </div>
            </div>

            <div className="h-72">
                {dailyTrend.length > 0 ? (
                    <Chart type="area" height="100%" options={options} series={series} />
                ) : (
                    <div className="analytics-chart-placeholder">No download trend data available.</div>
                )}
            </div>
        </section>
    );
}
