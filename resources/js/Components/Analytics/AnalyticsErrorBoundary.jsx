/**
 * ============================================================
 * Analytics Error Boundary Component
 * ============================================================
 *
 * Catches runtime rendering errors within individual analytics
 * widgets so one visual failure cannot crash the entire dashboard.
 * This retains the existing isolation behaviour while adopting the
 * TailAdmin visual system.
 *
 * BRAND: this widget deliberately stays outside the COZA royal-purple /
 * gold / emerald palette. Errors use the universal semantic `red` scale
 * so a failure is always instantly legible against every other
 * purple/gold/emerald-branded card on the dashboard — the same
 * red-as-exception rule already applied to the "Change vs Previous"
 * KPI card. The light-mode button previously mixed `error-*` utilities
 * (only partially defined in analyticsDashboard.css) with `red-*` in
 * dark mode; both are now unified on the full `red-*` Tailwind scale so
 * light/dark render identically.
 * ============================================================
 */

import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * @typedef {Object} ErrorBoundaryProps
 * @property {React.ReactNode} children - Wrapped chart or widget component.
 * @property {string} [title="Widget Error"] - Component label for display.
 */

/**
 * @typedef {Object} ErrorBoundaryState
 * @property {boolean} hasError - Error state flag.
 * @property {Error|null} error - Caught error object.
 */

/**
 * AnalyticsErrorBoundary
 *
 * Class-based error boundary (required by React, since boundaries cannot
 * be implemented as function components) wrapping a single analytics
 * widget. On an uncaught render error it swaps the widget for a compact,
 * on-brand-but-intentionally-red failure card with a manual retry action,
 * rather than propagating the error up and blanking the whole dashboard.
 *
 * @augments {Component<ErrorBoundaryProps, ErrorBoundaryState>}
 */
export class AnalyticsErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    /**
     * Logs an isolated analytics rendering error without interrupting
     * the rest of the dashboard.
     *
     * @param {Error} error - Caught rendering error.
     * @param {Object} errorInfo - React error boundary information.
     * @returns {void}
     */
    componentDidCatch(error, errorInfo) {
        console.error(
            `[AnalyticsErrorBoundary] Error in ${this.props.title || 'Component'}:`,
            error,
            errorInfo,
        );
    }

    /**
     * Resets the local error state so React can retry the child component.
     *
     * @returns {void}
     */
    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/70 p-6 text-center dark:border-red-500/20 dark:bg-red-500/[0.06]">
                <div className="mb-3 inline-flex size-11 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    <AlertTriangle className="size-5" />
                </div>
                <h3 className="text-base font-semibold text-red-800 dark:text-red-300">
                    Failed to render {this.props.title || 'widget'}
                </h3>
                <p className="mt-1 max-w-md text-sm text-red-700/80 dark:text-red-300/70">
                    An isolated rendering error occurred. The rest of the analytics dashboard remains available.
                </p>
                <button
                    type="button"
                    onClick={this.handleReset}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 shadow-theme-xs hover:bg-red-50 dark:border-red-500/20 dark:bg-white/[0.03] dark:text-red-300 dark:hover:bg-red-500/10"
                >
                    <RefreshCw className="size-3.5" />
                    Retry Widget
                </button>
            </div>
        );
    }
}
