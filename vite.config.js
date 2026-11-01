/**
 * ============================================================
 * Vite Configuration – COZA Laravel/Inertia/React
 * ============================================================
 *
 * Frontend build configuration for the existing Laravel application.
 * This file does not alter backend routes, controllers, services or
 * database behaviour. It only makes the current React/Tailwind build
 * configuration explicit and supports the merged TailAdmin frontend.
 * ============================================================
 */

import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/css/analyticsDashboard.css',
                'resources/js/app.jsx',
            ],
            refresh: true,
        }),

        react(),
        tailwindcss(),
    ],

    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, 'resources/js'),
            '@/components': path.resolve(
                import.meta.dirname,
                'resources/js/Components'
            ),
        },
    },

    optimizeDeps: {
        include: ['prop-types'],
        exclude: ['maplibre-gl'],
    },

    server: {
        /*
        * Development::
        * Use this server options to configure the vite server
        * to work through the configured loophole tunnels -  
        * "coza-vite.loophole.site" & "coza-analytics.loophole.site".
        */
        host: '127.0.0.1',

        port: 5173,

        strictPort: true,

        /*
        * Public URL through which browsers load Vite assets.
        */
        origin: 'https://coza-vite.loophole.site',

        /*
        * Allow the Laravel application to request Vite assets.
        */
        cors: {
            origin: 'https://coza-analytics.loophole.site',
        },

        /*
        * Only allow the Vite tunnel hostname.
        */
        allowedHosts: [
            'coza-vite.loophole.site',
        ],

        /*
        * IMPORTANT:
        * Do NOT tell Vite to listen on the public Loophole IP.
        *
        * Loophole will forward the public WebSocket connection
        * to Vite's local WebSocket server on port 5173.
        */

        watch: {
            usePolling: true,
            interval: 100,

            ignored: [
                '**/storage/framework/views/**',
            ],
        },
    },
});