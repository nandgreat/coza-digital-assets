// HMR ENTRY TEST 001
/**
 * COZA Digital Assets – Application Entry Point
 * 
 * This file boots the Inertia.js application with React.
 * It sets up the root component, page resolution with dynamic legacy layout fallbacks,
 * and global UI elements like the toast notification provider.
 * 
 * @see https://inertiajs.com/ (Inertia documentation)
 * @see https://react-hot-toast.com/ (Toast notifications)
 */

// ─── Imports ────────────────────────────────────────────────────────────────
import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import '../css/app.css'; // Legacy global styles evaluated first
import '../css/analyticsDashboard.css'; // Custom utilities and overrides evaluated second
import { Toaster } from 'react-hot-toast'; // Toast notification provider

// Register all required Chart.js components globally
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ─── Application Bootstrap ──────────────────────────────────────────────────

/**
 * Creates and initializes the Inertia application shell.
 * - Configures dynamic page title pre-pending ("COZA | ").
 * - Resolves page components and applies a `.legacy-app-wrapper` layout fallback.
 * - Mounts the application root along with top-level toast notifications.
 */
createInertiaApp({
    /**
     * Generate the document page title.
     * 
     * @param {string} [title] - The title defined on individual Inertia page views.
     * @returns {string} Formatted browser title string.
     */
    title: (title) => (title ? `COZA | ${title}` : 'COZA Digital Service Assets'),

    /**
     * Resolve the React page component corresponding to an Inertia route name.
     * Uses Vite's `import.meta.glob` to load pages dynamically.
     * 
     * @param {string} name - The page component path relative to `./Pages/`.
     * @returns {Object} Resolved page module with default layout applied.
     */
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true });
        const pageModule = pages[`./Pages/${name}.jsx`];

        if (!pageModule) {
            throw new Error(`Inertia page component "./Pages/${name}.jsx" could not be found.`);
        }

        const page = pageModule.default;

        /**
         * Fallback Layout Strategy for Scoping app.css
         * 
         * If a page component does NOT explicitly define its own custom layout property
         * (e.g., `Dashboard.layout = (page) => <AppLayout>{page}</AppLayout>`),
         * we wrap it automatically in `.legacy-app-wrapper`.
         * 
         * This isolates legacy rules (centering, max-widths, flex layout) to legacy views
         * while keeping SPA modules like the Analytics Dashboard unconstrained.
         */
        page.layout = page.layout || ((pageContent) => (
            <div className="legacy-app-wrapper">
                {pageContent}
            </div>
        ));

        return pageModule;
    },

    /**
     * Setup the React root DOM node and render the application structure.
     * 
     * @param {Object} options - Setup parameters provided by Inertia.
     * @param {HTMLElement} options.el - Target DOM container node.
     * @param {React.ComponentType} options.App - Main Inertia application runner component.
     * @param {Object} options.props - Props required by the Inertia application.
     */
    setup({ el, App, props }) {
        createRoot(el).render(
            <>
                {/* Global Toast Notifications – Positioned top-right */}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '12px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                            padding: '16px 20px',
                            fontFamily: 'inherit',
                        },
                        success: {
                            iconTheme: { primary: '#10B981', secondary: 'white' },
                        },
                        error: {
                            iconTheme: { primary: '#EF4444', secondary: 'white' },
                        },
                    }}
                />
                
                {/* Inertia Application Canvas */}
                <App {...props} />
            </>
        );
    },
});
