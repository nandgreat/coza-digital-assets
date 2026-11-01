import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Stores presentation state for the TailAdmin responsive sidebar.
 *
 * This context intentionally contains no analytics state. It only controls the
 * shell: desktop collapse, mobile drawer state, hover expansion and submenus.
 */
const SidebarContext = createContext(undefined);

/**
 * Provides responsive sidebar state to AppSidebar and AppHeader.
 *
 * @param {{ children: React.ReactNode }} props React provider props.
 * @returns {React.JSX.Element} Sidebar provider tree.
 */
export function SidebarProvider({ children }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [activeItem, setActiveItem] = useState(null);
    const [openSubmenu, setOpenSubmenu] = useState(null);

    useEffect(() => {
        /**
         * Synchronises the shell state with the current viewport.
         *
         * @returns {void}
         */
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;

            setIsMobile(mobile);

            if (!mobile) {
                setIsMobileOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    /**
     * Toggles the desktop sidebar between expanded and compact modes.
     *
     * @returns {void}
     */
    const toggleSidebar = () => setIsExpanded((current) => !current);

    /**
     * Toggles the mobile sidebar drawer.
     *
     * @returns {void}
     */
    const toggleMobileSidebar = () => setIsMobileOpen((current) => !current);

    /**
     * Toggles one sidebar submenu at a time.
     *
     * @param {string} item Stable submenu identifier.
     * @returns {void}
     */
    const toggleSubmenu = (item) => {
        setOpenSubmenu((current) => (current === item ? null : item));
    };

    const value = {
        isExpanded: isMobile ? false : isExpanded,
        isMobileOpen,
        isHovered,
        activeItem,
        openSubmenu,
        toggleSidebar,
        toggleMobileSidebar,
        setIsHovered,
        setActiveItem,
        toggleSubmenu,
    };

    return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

/**
 * Reads the responsive sidebar context.
 *
 * @returns {object} Sidebar state and actions.
 * @throws {Error} When invoked outside SidebarProvider.
 */
export function useSidebar() {
    const context = useContext(SidebarContext);

    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }

    return context;
}
