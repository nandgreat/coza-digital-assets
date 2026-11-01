/**
 * ============================================================
 * WittyBadge – "Witty Inventions" brand badge
 * ============================================================
 *
 * The badge artwork is white/lavender on a transparent background, so it is
 * nearly invisible on a light surface. It therefore always sits on a COZA
 * purple disc, which keeps it legible in light AND dark mode.
 *
 * Sizing is fluid: pass Tailwind size classes per breakpoint through
 * `className` (e.g. "size-8 sm:size-9 lg:size-10"). The disc, the image and
 * the ring all scale with that single box, so the badge stays crisp and
 * circular from small phones to wide desktop displays.
 * ============================================================
 */

import React from 'react';

/**
 * @param {Object} props
 * @param {string} [props.className] - Size / spacing classes (controls the whole badge).
 * @param {string} [props.alt] - Accessible name.
 * @returns {React.JSX.Element}
 */
export default function WittyBadge({ className = 'size-9', alt = 'Witty Inventions' }) {
    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-coza-purple-700 shadow-sm ring-1 ring-coza-purple-300/60 dark:bg-coza-purple-900 dark:ring-coza-purple-400/30 ${className}`}
        >
            <img
                src="/images/witty_logo_128.png"
                srcSet="/images/witty_logo_128.png 1x, /images/witty_logo.png 3x"
                alt={alt}
                width="128"
                height="128"
                loading="lazy"
                decoding="async"
                draggable="false"
                className="size-full select-none object-contain"
            />
        </span>
    );
}
