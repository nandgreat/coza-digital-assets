/**
 * ============================================================
 * Backdrop Component – COZA Analytics Dashboard
 * ============================================================
 *
 * Mobile backdrop used by the TailAdmin sidebar drawer. Renders nothing
 * (returns `null`) whenever the mobile drawer is closed, so it never adds
 * an empty DOM node to the layout in the common desktop case.
 *
 * BRAND: the scrim carries a faint royal-purple tint (rather than plain
 * neutral black) so the overlay still reads as part of the COZA visual
 * system while it's covering the rest of the page.
 * ============================================================
 */

import React from 'react';
import { useSidebar } from '../Contexts/SidebarContext';

/**
 * Backdrop Component
 *
 * @component
 * @returns {React.JSX.Element|null} Backdrop element when the drawer is open.
 */
export default function Backdrop() {
    const { isMobileOpen, toggleMobileSidebar } = useSidebar();

    if (!isMobileOpen) {
        return null;
    }

    return (
        <div
            // Purple-tinted scrim: a plain `bg-gray-900/50` would be brand-neutral
            className="fixed inset-0 z-40 bg-[#211a2a]/55 backdrop-blur-[1px] lg:hidden"
            aria-hidden="true"
            onClick={toggleMobileSidebar}
        />
    );
}
