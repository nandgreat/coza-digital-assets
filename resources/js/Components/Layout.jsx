import { Link } from '@inertiajs/react';

export default function Layout({ backHref, backLabel, tagline = 'Digital Service Assets', headerExtra, children }) {
    return (
        <>
            {backHref && (
                <Link className="back-link" href={backHref}>
                    ← {backLabel ?? 'Back'}
                </Link>
            )}

            <header>
                <div className="logo-row">
                    <div className="logo-badge takeover-badge">
                        <img src="/images/logo/renewing-strength.png" alt="COZA — Renewing Your Strength, Isaiah 40:31" />
                    </div>
                </div>
                <div className="cgls-stripe" />
                <h1 className="brand">COZA</h1>
                <div className="tagline">{tagline}</div>
                {headerExtra}
            </header>

            {children}

            <footer>
                &copy; 2026 COZA Digital Service Assets &middot; Commonwealth of Zion Assembly &middot; All rights
                reserved.
                <br />
                <span style={{ marginTop: 8, display: 'inline-block', fontSize: 14 }}>
                    Powered by <strong>Witty Inventions</strong>
                </span>
            </footer>
        </>
    );
}
