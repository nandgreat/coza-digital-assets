/**
 * ============================================================
 * AppLayout Component – COZA Analytics Dashboard
 * ============================================================
 *
 * Top-level page shell: mounts the sidebar, mobile backdrop, header, and
 * main content canvas inside the `SidebarProvider` / `ThemeProvider`
 * context pair every other analytics component relies on.
 *
 * BRAND: `.analytics-dashboard-root` (applied here) is the CSS isolation
 * boundary defined in analyticsDashboard.css — it supplies the COZA
 * radial-gradient page background and swaps the `--coza-*` token set
 * between light/dark automatically via the `.dark` class. Because
 * `--color-gray-*` is itself redefined to a purple-tinted neutral scale
 * in that stylesheet, the plain `bg-gray-50 dark:bg-gray-950` classes
 * below are already on-brand without needing bespoke `coza-*` utilities.
 * ============================================================
 */

import React from 'react';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import Backdrop from './Backdrop';
import { SidebarProvider, useSidebar } from '../Contexts/SidebarContext';
import { ThemeProvider } from '../Contexts/ThemeContext';

/**
 * LayoutContent
 *
 * Inner layout renderer that actually consumes `useSidebar()`. Split out
 * from `AppLayout` because the sidebar's expanded/hovered state must be
 * read *inside* `SidebarProvider`, not at the point where the provider
 * itself is mounted.
 *
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content rendered inside the main canvas.
 * @param {Function} [props.onRefresh] - Forwarded to `AppHeader`'s refresh action.
 * @param {Function} [props.onExport] - Forwarded to `AppHeader`'s export action.
 * @param {boolean} [props.isRefreshing] - Forwarded refresh-in-progress flag.
 * @returns {React.JSX.Element} The full page shell.
 */
function LayoutContent({ children, onRefresh, onExport, isRefreshing }) {
    const { isExpanded, isHovered } = useSidebar();

    // Use padding-left on desktop instead of margin-left to prevent 100% + 290px container overflow
    const desktopPadding = isExpanded || isHovered ? 'lg:pl-[290px]' : 'lg:pl-[90px]';

    return (
        <div className="analytics-dashboard-root min-h-screen w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white antialiased">
            {/* Sidebar rendered as absolute fixed overlay layer */}
            <AppSidebar />
            
            <Backdrop />

            {/* Main Canvas Shell */}
            <div className={`min-h-screen w-full transition-[padding] duration-300 ease-in-out ${desktopPadding}`}>
                <AppHeader
                    onRefresh={onRefresh}
                    onExport={onExport}
                    isRefreshing={isRefreshing}
                />

                <main className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}

/**
 * AppLayout Component
 *
 * Public entry point: wraps `LayoutContent` in the `ThemeProvider` and
 * `SidebarProvider` context pair so every descendant (header, sidebar,
 * backdrop, and page content) shares one source of truth for the active
 * theme and sidebar expansion state.
 *
 * @component
 * @param {Object} props - Forwarded directly to `LayoutContent`.
 * @returns {React.JSX.Element}
 */
export default function AppLayout(props) {
    return (
        <ThemeProvider>
            <SidebarProvider>
                <LayoutContent {...props} />
            </SidebarProvider>
        </ThemeProvider>
    );
}