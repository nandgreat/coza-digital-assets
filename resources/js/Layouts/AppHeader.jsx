/**
 * ============================================================
 * AppHeader Component – COZA Analytics Dashboard
 * ============================================================
 *
 * TailAdmin-inspired application header for analytics pages.
 *
 * The component deliberately receives analytics actions from the page instead of
 * reaching into the analytics hook itself. This keeps the layout reusable and
 * ensures the first migration cannot mutate the existing data-fetching contract.
 *
 * BRAND: the eyebrow label uses COZA purple and the page title picks up a
 * gold tint in dark mode — deliberately avoiding an all-white dark-theme
 * header — while the search focus ring and the "Export" action share the
 * royal-purple accent. The "Sign out" action keeps a plain neutral-to-red
 * hover (see inline note) as the one deliberate non-brand exception, same
 * rule used for error/decline states elsewhere in the dashboard.
 *
 * BRAND REVAMP (v2.1): the header uses the shared `.coza-header-glass`
 * utility (analyticsDashboard.css §"12. HEADER / SIDEBAR GLASS SURFACES").
 *
 * BRAND BADGE (v2.3): the user-icon placeholder is replaced by the
 * "Witty Inventions" badge (`WittyBadge`), shown at every breakpoint and
 * scaled fluidly (size-8 -> 2xl:size-11).
 *
 * HEADER UPDATE (v2.2):
 *   - Sticky in BOTH themes: the light-mode override of `.coza-header-glass`
 *     in analyticsDashboard.css now uses `position: sticky` instead of
 *     `position: relative`.
 *   - Mobile: theme toggle, refresh, export and sign-out are always visible.
 *     Below `sm` the refresh/export buttons collapse to icon-only squares;
 *     from `sm` up they show their text labels again.
 *   - Tooltips: every icon button is wrapped in `HeaderTooltip`. It shows on
 *     mouse hover and keyboard focus (desktop) and on tap (touch devices,
 *     auto-hides after ~1.6s).
 * ============================================================
 */

import React, { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    Download,
    LogOut,
    Menu,
    Moon,
    RefreshCw,
    Search,
    Sun,
} from 'lucide-react';
import WittyBadge from '../Components/Analytics/WittyBadge';
import { useSidebar } from '../Contexts/SidebarContext';
import { useTheme } from '../Contexts/ThemeContext';

/**
 * HeaderTooltip
 *
 * Lightweight CSS tooltip that sits under its child control.
 * - Mouse:    appears on hover.
 * - Keyboard: appears on `:focus-visible` of the wrapped control.
 * - Touch:    appears on tap and hides itself after ~1.6s (touch devices
 *             have no hover, and iOS Safari does not focus buttons on tap).
 *
 * @component
 * @param {Object} props
 * @param {string} props.label - Tooltip text.
 * @param {'start'|'center'|'end'} [props.align='center'] - Horizontal anchor;
 *        use 'end' for the right-most control and 'start' for the left-most
 *        so the bubble never overflows the viewport on small screens.
 * @param {React.ReactNode} props.children - The control being described.
 * @returns {React.JSX.Element}
 */
function HeaderTooltip({ label, align = 'center', children }) {
    const [touchVisible, setTouchVisible] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    const handlePointerDown = (event) => {
        if (event.pointerType !== 'touch') return;

        setTouchVisible(true);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setTouchVisible(false), 1600);
    };

    const alignClass =
        align === 'end'
            ? 'right-0'
            : align === 'start'
              ? 'left-0'
              : 'left-1/2 -translate-x-1/2';

    return (
        <div className="group/tip relative inline-flex" onPointerDown={handlePointerDown}>
            {children}
            <span
                role="tooltip"
                className={`pointer-events-none absolute top-full z-50 mt-2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100 group-has-[:focus-visible]/tip:opacity-100 dark:bg-white dark:text-gray-900 ${alignClass} ${
                    touchVisible ? 'opacity-100' : 'opacity-0'
                }`}
            >
                {label}
            </span>
        </div>
    );
}

/**
 * AppHeader Component
 *
 * @component
 * @param {{ onRefresh?: Function, onExport?: Function, isRefreshing?: boolean }} props Header actions.
 * @returns {React.JSX.Element} Header toolbar.
 */
export default function AppHeader({ onRefresh, onExport, isRefreshing = false }) {
    const { url } = usePage();
    const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
    const { theme, toggleTheme } = useTheme();

    const isAnalyticsPage = url.startsWith('/analytics');

    /**
     * Handles the responsive menu button.
     *
     * @returns {void}
     */
    const handleMenuToggle = () => {
        if (window.innerWidth >= 1024) {
            toggleSidebar();
            return;
        }

        toggleMobileSidebar();
    };

    /**
     * Logs out using the existing analytics POST endpoint.
     *
     * @returns {void}
     */
    const handleLogout = () => {
        router.post('/analytics/logout');
    };

    return (
        <header className="coza-header-glass">
            <div className="flex min-h-20 items-center justify-between gap-3 px-4 md:gap-4 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <HeaderTooltip
                        label={isMobileOpen ? 'Close navigation' : 'Toggle navigation'}
                        align="start"
                    >
                        <button
                            type="button"
                            onClick={handleMenuToggle}
                            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-coza-purple-200/60 text-gray-700 hover:bg-coza-purple-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                            aria-label={isMobileOpen ? 'Close navigation' : 'Open navigation'}
                        >
                            <Menu className="size-5" />
                        </button>
                    </HeaderTooltip>

                    <div className="hidden min-w-0 md:block">
                        {/* Eyebrow label: subtle royal-purple tint in dark mode instead of plain gray */}
                        <p className="truncate text-xs font-medium uppercase tracking-[0.16em] text-coza-purple-700 dark:text-coza-purple-300/80">
                            COZA Digital Assets
                        </p>
                        {/* Page title: gold tint in dark mode so the header isn't monochrome white */}
                        <h1 className="truncate text-base font-semibold text-gray-900 dark:text-coza-gold-300">
                            {isAnalyticsPage ? 'Analytics Dashboard' : 'Management Console'}
                        </h1>
                    </div>
                </div>

                <div className="hidden flex-1 justify-center px-6 xl:flex">
                    <div className="relative w-full max-w-107.5">
                        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-coza-purple-600 dark:text-gray-500" />
                        <input
                            type="search"
                            placeholder="Search or type command..."
                            className="h-11 w-full rounded-lg border border-coza-purple-200/60 bg-white/70 py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-600 shadow-theme-xs outline-none transition focus:border-coza-purple-300 focus:ring-3 focus:ring-coza-purple-500/10 dark:border-white/10 dark:bg-white/3 dark:text-glass-primary dark:placeholder:text-white/30"
                        />
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <HeaderTooltip label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="inline-flex size-10 items-center justify-center rounded-lg border border-coza-purple-200/60 text-gray-700 hover:bg-coza-purple-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
                        </button>
                    </HeaderTooltip>

                    {onRefresh && (
                        <HeaderTooltip label={isRefreshing ? 'Refreshing…' : 'Refresh data'}>
                            <button
                                type="button"
                                onClick={onRefresh}
                                disabled={isRefreshing}
                                aria-label="Refresh data"
                                className="inline-flex size-10 items-center justify-center gap-2 rounded-lg border border-coza-purple-200/60 text-sm font-medium text-gray-800 transition hover:bg-coza-purple-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5 sm:size-auto sm:px-3 sm:py-2.5"
                            >
                                <RefreshCw className={isRefreshing ? 'size-4 animate-spin' : 'size-4'} />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                        </HeaderTooltip>
                    )}

                    {onExport && (
                        <HeaderTooltip label="Export data">
                            <button
                                type="button"
                                onClick={onExport}
                                aria-label="Export data"
                                className="inline-flex size-10 items-center justify-center gap-2 rounded-lg border border-coza-purple-200 bg-coza-purple-50 text-sm font-medium text-coza-purple-700 transition hover:bg-coza-purple-100 dark:border-coza-purple-500/20 dark:bg-coza-purple-500/10 dark:text-coza-purple-400 dark:hover:bg-coza-purple-500/20 sm:size-auto sm:px-3 sm:py-2.5"
                            >
                                <Download className="size-4" />
                                <span className="hidden sm:inline">Export</span>
                            </button>
                        </HeaderTooltip>
                    )}

                    {/* Witty Inventions badge (replaces the generic user icon). Visible on every
                        screen size and scaled fluidly: 32px on phones up to 44px on large displays. */}
                    <div className="relative flex items-center gap-2 pl-1 sm:pl-2 md:border-l md:border-coza-purple-200/50 md:pl-3 dark:md:border-white/10">
                        <WittyBadge className="size-8 sm:size-9 lg:size-10 2xl:size-11" />
                        <div className="hidden min-w-0 lg:block">
                            {/* Emerald tint on the user's name adds a second dark-theme accent beyond gold/purple */}
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-coza-emerald-300">
                                Witty
                            </p>
                            <p className="hidden text-xs text-gray-500 dark:text-gray-400">COZA Console</p>
                        </div>
                    </div>

                    {/*
                      Sign-out action: soft-red hover pattern used for the
                      error/decline states elsewhere in the dashboard.
                      Tooltip is end-aligned so it stays inside the viewport
                      on narrow screens (this is the right-most control).
                    */}
                    <HeaderTooltip label="Sign out" align="end">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex size-10 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                            aria-label="Sign out"
                        >
                            <LogOut className="size-5" />
                        </button>
                    </HeaderTooltip>
                </div>
            </div>
        </header>
    );
}
