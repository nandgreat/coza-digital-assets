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
 * ============================================================
 */

import React from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    Download,
    LogOut,
    Menu,
    Moon,
    RefreshCw,
    Search,
    Sun,
    UserCircle2,
} from 'lucide-react';
import { useSidebar } from '../Contexts/SidebarContext';
import { useTheme } from '../Contexts/ThemeContext';

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
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-[#130e19]">
            <div className="flex min-h-20 items-center justify-between gap-4 px-4 md:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <button
                        type="button"
                        onClick={handleMenuToggle}
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
                        aria-label={isMobileOpen ? 'Close navigation' : 'Open navigation'}
                    >
                        <Menu className="size-5" />
                    </button>

                    <div className="hidden min-w-0 md:block">
                        {/* Eyebrow label: subtle royal-purple tint in dark mode instead of plain gray */}
                        <p className="truncate text-xs font-medium uppercase tracking-[0.16em] text-gray-400 dark:text-coza-purple-300/80">
                            COZA Digital Assets
                        </p>
                        {/* Page title: gold tint in dark mode so the header isn't monochrome white */}
                        <h1 className="truncate text-base font-semibold text-gray-800 dark:text-coza-gold-300">
                            {isAnalyticsPage ? 'Analytics Dashboard' : 'Management Console'}
                        </h1>
                    </div>
                </div>

                <div className="hidden flex-1 justify-center px-6 xl:flex">
                    <div className="relative w-full max-w-107.5">
                        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            placeholder="Search or type command..."
                            className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs outline-none transition focus:border-coza-purple-300 focus:ring-3 focus:ring-coza-purple-500/10 dark:border-gray-800 dark:bg-white/3 dark:text-glass-primary dark:placeholder:text-white/30"
                        />
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="inline-flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
                    </button>

                    {onRefresh && (
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className="hidden items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5 sm:inline-flex"
                        >
                            <RefreshCw className={isRefreshing ? 'size-4 animate-spin' : 'size-4'} />
                            <span>Refresh</span>
                        </button>
                    )}

                    {onExport && (
                        <button
                            type="button"
                            onClick={onExport}
                            className="hidden items-center gap-2 rounded-lg border border-coza-purple-200 bg-coza-purple-50 px-3 py-2.5 text-sm font-medium text-coza-purple-600 transition hover:bg-coza-purple-100 dark:border-coza-purple-500/20 dark:bg-coza-purple-500/10 dark:text-coza-purple-400 dark:hover:bg-coza-purple-500/20 sm:inline-flex"
                        >
                            <Download className="size-4" />
                            <span>Export</span>
                        </button>
                    )}

                    <div className="relative hidden items-center gap-2 border-l border-gray-200 pl-3 md:flex dark:border-gray-800">
                        <UserCircle2 className="size-8 text-gray-400" />
                        <div className="hidden min-w-0 lg:block">
                            {/* Emerald tint on the user's name adds a second dark-theme accent beyond gold/purple */}
                            <p className="truncate text-sm font-semibold text-gray-800 dark:text-coza-emerald-300">
                                Witty
                            </p>
                            <p className="hidden text-xs text-gray-500 dark:text-gray-400">COZA Console</p>
                        </div>
                    </div>

                    {/*
                      Sign-out action: was previously broken — `hover:bg-red-400
                      hover:text-black` gave poor contrast, and `dark:hover:bg-red/4`
                      is not a valid Tailwind color (no "red" utility without a
                      numeric shade), so the dark-mode hover silently did nothing.
                      Replaced with the same soft-red pattern used for the
                      error/decline states elsewhere in the dashboard.
                    */}
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex size-10 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                        aria-label="Sign out"
                        title="Sign out"
                    >
                        <LogOut className="size-5" />
                    </button>
                </div>
            </div>
        </header>
    );
}
