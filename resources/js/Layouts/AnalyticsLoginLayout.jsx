import React from 'react';
import { Link } from '@inertiajs/react';
import '../../css/analyticsLogin.css';

export default function AnalyticsLoginLayout({ tagline = 'Analytics', headerExtra, children }) {
    return (
        <>
            
                <header>
                    <div className="coza-logo-analytics">
                        <img src="/images/coza_logo.png" alt="COZA Logo" />
                    </div>
                    <h1 className="text-3xl text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-amber-500">
                        ANALYTICS DASHBOARD
                    </h1>
                    <div className="tagline text-purple-700/60">{tagline}</div>
                    {headerExtra}
                </header>

                {children}

                <footer className="text-purple-600/30">
                    &copy; 2026 COZA Digital Service Assets &middot; Commonwealth of Zion Assembly &middot; All rights
                    reserved.
                    <br />
                    <span style={{ marginTop: 8, display: 'inline-block', fontSize: 14 }}>
                        Powered by <strong className="text-purple-800">Witty Inventions</strong>
                    </span>
                </footer>
            
        </>
    );
}