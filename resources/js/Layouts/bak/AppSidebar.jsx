import React, { useEffect, useMemo } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    ChevronDown,
    Grid2X2,
    Map,
    Monitor,
    PanelLeft,
    Settings2,
    Table2,
    Users,
    X,
} from 'lucide-react';
import { useSidebar } from '../Contexts/SidebarContext';

/**
 * Production navigation model for the COZA analytics application.
 *
 * Paths deliberately use the application's existing URLs. This keeps the first
 * migration independent from any route/helper refactor and avoids touching the
 * working analytics backend.
 *
 * BRAND: the sidebar's active-item highlight, icon accents, and the
 * bottom "Analytics Console" info panel all draw from the COZA royal-
 * purple / gold tokens — see the `menu-item-active`, `menu-item-icon-
 * active` utilities (analyticsDashboard.css §"05. NAVIGATION & SIDEBAR")
 * for the gold inset-border + purple glow treatment already applied to
 * the active nav link.
 */
const navigationGroups = [
    {
        label: 'Analytics',
        items: [
            { label: 'Dashboard', path: '/analytics', icon: Grid2X2 },
            { label: 'Breakdown', path: '/analytics/breakdown', icon: BarChart3 },
            { label: 'Sessions', path: '/analytics/sessions', icon: Table2 },
            { label: 'Geography', path: '/analytics/geo', icon: Map },
            { label: 'Unique by Asset', path: '/analytics/unique-by-asset', icon: Users },
        ],
    },
];

/**
 * TailAdmin-style responsive sidebar adapted for COZA Digital Assets Analytics.
 *
 * @returns {React.JSX.Element} Responsive navigation shell.
 */
export default function AppSidebar() {
    const { url } = usePage();
    const {
        isExpanded,
        isMobileOpen,
        isHovered,
        setIsHovered,
        toggleMobileSidebar,
    } = useSidebar();

    const allItems = useMemo(
        () => navigationGroups.flatMap((group) => group.items),
        []
    );

    useEffect(() => {
        // Close the mobile drawer after a normal Inertia navigation.
        if (isMobileOpen) {
            toggleMobileSidebar();
        }
        // The navigation URL is the only intentional trigger.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    /**
     * Determines whether a menu item represents the current application page.
     *
     * @param {string} path Application path.
     * @returns {boolean} True when the item is active.
     */
    const isActive = (path) => {
        if (path === '/analytics') {
            return url === '/analytics' || url === '/analytics/';
        }

        return url.startsWith(path);
    };

    const showLabels = isExpanded || isHovered || isMobileOpen;

    return (
        <aside
            className={[
                'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out',
                'dark:border-gray-800 dark:bg-[#130e19] dark:text-white',
                isExpanded || isMobileOpen || isHovered ? 'w-72.5' : 'w-22.5',
                isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
            ].join(' ')}
            onMouseEnter={() => !isExpanded && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label="Analytics navigation"
        >
            <div className="flex h-20 shrink-0 items-center justify-between">
                <Link href="/analytics" className="flex min-w-0 items-center">
                    {showLabels ? (
                        <img
                            src="/images/logo/coza-logo.svg"
                            alt="COZA Digital Assets"
                            width="70"
                            height="70"
                            className="max-w-42.5 dark:hidden"
                        />
                    ) : (
                        <img
                            src="/images/logo/coza-logo-icon.svg"
                            alt="COZA Digital Assets"
                            width="50"
                            height="50"
                            className="dark:hidden"
                        />
                    )}

                    {showLabels ? (
                        <img
                            src="/images/logo/coza-logo.svg"
                            alt="COZA Digital Assets"
                            width="70"
                            height="70"
                            className="hidden max-w-42.5 dark:block"
                        />
                    ) : (
                        <img
                            src="/images/logo/coza-logo-icon.svg"
                            alt="COZA Digital Assets"
                            width="50"
                            height="50"
                            className="hidden dark:block"
                        />
                    )}
                </Link>

                {isMobileOpen && (
                    <button
                        type="button"
                        onClick={toggleMobileSidebar}
                        className="inline-flex size-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                        aria-label="Close navigation"
                    >
                        <X className="size-5" />
                    </button>
                )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-6 no-scrollbar">
                <nav className="space-y-8 pt-4">
                    {navigationGroups.map((group) => (
                        <section key={group.label}>
                            {showLabels ? (
                                <h2 className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                                    {group.label}
                                </h2>
                            ) : (
                                <div className="mb-4 flex justify-center text-gray-400">
                                    <PanelLeft className="size-5" />
                                </div>
                            )}

                            <ul className="space-y-2">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const active = isActive(item.path);

                                    return (
                                        <li key={item.path}>
                                            <Link
                                                href={item.path}
                                                className={[
                                                    'menu-item group',
                                                    active
                                                        ? 'menu-item-active'
                                                        : 'menu-item-inactive',
                                                    !showLabels ? 'justify-center' : 'justify-start',
                                                ].join(' ')}
                                            >
                                                <span
                                                    className={[
                                                        'menu-item-icon-size shrink-0',
                                                        active
                                                            ? 'menu-item-icon-active'
                                                            : 'menu-item-icon-inactive',
                                                    ].join(' ')}
                                                >
                                                    <Icon className="size-5" />
                                                </span>

                                                {showLabels && (
                                                    <span className="menu-item-text min-w-0 truncate">
                                                        {item.label}
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </nav>

                {showLabels && (
                    <div className="mt-auto pt-8">
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/3">
                            <div className="flex items-start gap-3">
                                {/* Purple icon chip matches the KPI/chart icon language elsewhere in the app */}
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-coza-purple-50 text-coza-purple-500 dark:bg-coza-purple-500/10 dark:text-coza-purple-400">
                                    <Monitor className="size-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-glass-primary">
                                        Analytics Console
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                        COZA Digital Assets reporting and monitoring.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
