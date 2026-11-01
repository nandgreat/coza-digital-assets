/**
 * ============================================================
 * AutoRefreshBanner Component – COZA Analytics Dashboard
 * ============================================================
 *
 * TailAdmin-styled informational banner for the existing automatic
 * refresh behaviour. This component does not initiate or alter the
 * refresh operation itself.
 *
 * BRAND: already fully wired to the COZA brand system — the
 * `.analytics-auto-refresh-banner` utility (analyticsDashboard.css
 * §"10. INTERACTION / STATUS COMPONENTS") sets `color: var(--coza-gold)`
 * plus the matching soft gold background/border in both themes, so the
 * icon and text below intentionally carry no color classes of their own
 * and simply inherit that gold `currentColor` — the same
 * single-source-of-truth pattern used by `RefreshIndicator`'s spinner.
 * ============================================================
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * AutoRefreshBanner props.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.show - If true, the banner is visible.
 * @returns {JSX.Element|null}
 */
export default function AutoRefreshBanner({ show }) {
    if (!show) return null;

    return (
        <div className="analytics-auto-refresh-banner">
            {/* No explicit color class — inherits COZA gold from the parent utility */}
            <RefreshCw className="size-4" />
            <span>No data found. Automatic refresh has been triggered in the background.</span>
        </div>
    );
}
