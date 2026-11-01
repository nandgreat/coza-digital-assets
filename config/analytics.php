<?php

// config/analytics.php
return [
    // The analytics username is fixed by product requirement.
    'username' => env('ANALYTICS_USERNAME', 'Analytics'),

    // The analytics access password (see .env).
    'password' => env('ANALYTICS_PASSWORD'),

    // Passwords must be exactly this many characters.
    'password_length' => 8,

    /*
    | Early tracking (before the GA4 custom dimensions were registered) produced
    | "(not set)" / "unknown" values for the 7DG programme. Any blank
    | service_type / program / session inside this window is stored as the label.
    */
    'legacy_7dg' => [
        'label' => env('ANALYTICS_7DG_LABEL', '7DG'),
        'start' => env('ANALYTICS_7DG_START', '2026-07-01'),
        'end'   => env('ANALYTICS_7DG_END', '2026-07-07'),
    ],

    // Shown when an asset type is blank AND cannot be inferred from the page path.
    'asset_fallback_label' => 'Uncategorised',

    // Scheduled refresh windows (days back from today).
    'refresh_recent_days'   => 3,
    'refresh_backfill_days' => 14,
];
