import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
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
 * BRAND: the sidebar's active-item highlight, icon accents, and the
 * bottom "Analytics Console" info panel all draw from the COZA royal-
 * purple / gold tokens.
 *
 * BRAND REVAMP (v2.1): the sidebar now renders on the `.coza-sidebar-glass`
 * surface (analyticsDashboard.css §"13") — a translucent purple-gold tint
 * in light mode and the existing dark purple gradient in dark mode — with
 * `.coza-menu-item-active` / `.coza-menu-item-inactive` for legible,
 * theme-aware link text, plus a `.coza-sidebar-link-divider` between each
 * nav item.
 *
 * BUG FIX (v2.2) — sidebar items are same-page anchors, not real routes:
 * `Dashboard.jsx` renders every one of these sections (`overview`,
 * `breakdowns`, `unique-user-intelligence`, `geography`, `sessions`) on a
 * single mounted page, each already carrying a matching `id` + a
 * `scroll-mt-24` offset for exactly this purpose. Previously these items
 * were real Inertia `<Link>`s pointing at their own backend routes, so
 * every click did a full page revisit — refetching all analytics data and
 * resetting scroll position.
 * `path` is kept only as the bookmark-safe URL each item conceptually
 * corresponds to (and still resolves correctly server-side via the
 * Inertia-fallback guard in `AnalyticsController`) — in-app clicks now
 * smooth-scroll to `sectionId` instead of navigating.
 */
const navigationGroups = [
    {
        label: 'Analytics',
        items: [
            { label: 'Dashboard', path: '/analytics', sectionId: 'overview', icon: Grid2X2 },
            { label: 'Breakdown', path: '/analytics/breakdown', sectionId: 'breakdowns', icon: BarChart3 },
            { label: 'Unique by Asset', path: '/analytics/unique-by-asset', sectionId: 'unique-user-intelligence', icon: Users },
            { label: 'Geography', path: '/analytics/geo', sectionId: 'geography', icon: Map },
            { label: 'Sessions', path: '/analytics/sessions', sectionId: 'sessions', icon: Table2 },
        ],
    },
];

/**
 * TailAdmin-style responsive sidebar adapted for COZA Digital Assets Analytics.
 *
 * @returns {React.JSX.Element} Responsive navigation shell.
 */
export default function AppSidebar() {
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

    const [activeSection, setActiveSection] = useState(allItems[0]?.sectionId ?? 'overview');

    // Scroll-spy: since navigating between sections no longer changes the
    // URL, track whichever section is currently scrolled into view so the
    // matching sidebar item still gets highlighted.
    useEffect(() => {
        if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
            return undefined;
        }

        const elements = allItems
            .map((item) => document.getElementById(item.sectionId))
            .filter(Boolean);

        if (!elements.length) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

                if (visible.length) {
                    setActiveSection(visible[0].target.id);
                }
            },
            { rootMargin: '-112px 0px -65% 0px', threshold: 0 }
        );

        elements.forEach((element) => observer.observe(element));

        return () => observer.disconnect();
    }, [allItems]);

    /**
     * Smooth-scrolls to a section instead of visiting its backend route.
     * Every destination lives on this single mounted Dashboard page, so a
     * real Inertia visit would needlessly re-fetch all analytics data and
     * reset scroll position for no benefit.
     *
     * @param {Event} event
     * @param {{sectionId: string}} item
     * @returns {void}
     */
    const handleNavigate = useCallback((event, item) => {
        event.preventDefault();

        const target = document.getElementById(item.sectionId);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveSection(item.sectionId);

            if (typeof window !== 'undefined' && window.history?.replaceState) {
                window.history.replaceState(null, '', `#${item.sectionId}`);
            }
        }

        if (isMobileOpen) {
            toggleMobileSidebar();
        }
    }, [isMobileOpen, toggleMobileSidebar]);

    const isActive = (item) => activeSection === item.sectionId;

    const showLabels = isExpanded || isHovered || isMobileOpen;

    return (
        <aside
            className={[
                'coza-sidebar-glass fixed left-0 top-0 z-50 flex h-screen flex-col px-5 text-gray-900 dark:text-white',
                isExpanded || isMobileOpen || isHovered ? 'w-72.5' : 'w-22.5',
                isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
            ].join(' ')}
            onMouseEnter={() => !isExpanded && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label="Analytics navigation"
        >
            <div className="flex h-20 shrink-0 items-center justify-between border-b border-coza-purple-200/40 dark:border-white/8">
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
                        className="inline-flex size-10 items-center justify-center rounded-lg text-gray-500 hover:bg-coza-purple-50 dark:text-gray-400 dark:hover:bg-white/5"
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
                                <h2 className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-coza-purple-500/80 dark:text-gray-400">
                                    {group.label}
                                </h2>
                            ) : (
                                <div className="mb-4 flex justify-center text-coza-purple-400 dark:text-gray-400">
                                    <PanelLeft className="size-5" />
                                </div>
                            )}

                            <ul>
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const active = isActive(item);

                                    return (
                                        <li key={item.path} className="coza-sidebar-link-divider py-1">
                                            <a
                                                href={`#${item.sectionId}`}
                                                onClick={(event) => handleNavigate(event, item)}
                                                className={[
                                                    'menu-item group',
                                                    active
                                                        ? 'coza-menu-item-active'
                                                        : 'coza-menu-item-inactive',
                                                    !showLabels ? 'justify-center' : 'justify-start',
                                                ].join(' ')}
                                            >
                                                <span
                                                    className={[
                                                        'menu-item-icon-size shrink-0',
                                                        active
                                                            ? 'coza-menu-item-icon-active'
                                                            : 'coza-menu-item-icon-inactive',
                                                    ].join(' ')}
                                                >
                                                    <Icon className="size-5" />
                                                </span>

                                                {showLabels && (
                                                    <span className="menu-item-text min-w-0 truncate">
                                                        {item.label}
                                                    </span>
                                                )}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </nav>

                {showLabels && (
                    <div className="mt-auto pt-8">
                        <div className="rounded-2xl border border-coza-purple-200/50 bg-linear-to-br from-coza-purple-50/80 to-coza-gold-50/40 p-4 dark:border-white/8 dark:bg-white/3 dark:from-transparent dark:to-transparent">
                            <div className="flex items-start gap-3">
                                {/* Purple icon chip matches the KPI/chart icon language elsewhere in the app */}
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-coza-purple-100 text-coza-purple-600 dark:bg-coza-purple-500/10 dark:text-coza-purple-400">
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
