/**
 * ============================================================
 * RefreshIndicator Component – COZA Analytics Dashboard
 * ============================================================
 *
 * TailAdmin-styled floating status indicator displayed while the
 * existing analytics refresh job is running.
 *
 * BRAND: the `.analytics-refresh-indicator` utility (defined in
 * analyticsDashboard.css) already sets `color: var(--coza-primary)` on
 * this wrapper, so the icon deliberately omits its own text-color class
 * and inherits that royal-purple `currentColor` — keeping a single
 * source of truth for the brand hue in both themes.
 * ============================================================
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * RefreshIndicator props.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.show - If true, the indicator is visible.
 * @returns {JSX.Element|null}
 */
export default function RefreshIndicator({ show }) {
    if (!show) return null;

    return (
        <div className="analytics-refresh-indicator">
            {/* Inherits COZA royal-purple from the parent utility's `color` */}
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm font-medium">Syncing analytics with GA4…</span>
        </div>
    );
}
