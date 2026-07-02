import { Head } from '@inertiajs/react';
import { useState } from 'react';
import Layout from '../Components/Layout';

export default function Quotes({ session, quotes }) {
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [toast, setToast] = useState(null);

    const contextParts = [
        session.editionTag ? session.editionTag : session.program.name,
        session.subtitle ? `${session.name} — ${session.subtitle}` : session.name,
        session.dateLabel,
    ].filter(Boolean);

    function showToast(message) {
        setToast(message);
        setTimeout(() => setToast(null), 2200);
    }

    async function share(quote) {
        if (navigator.share) {
            try {
                await navigator.share({ title: quote.title, text: quote.title, url: quote.url });
            } catch {
                // user cancelled share — no action needed
            }
        } else if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(quote.url);
                showToast('Link copied to clipboard');
            } catch {
                showToast('Unable to copy link');
            }
        } else {
            showToast('Sharing not supported on this browser');
        }
    }

    return (
        <Layout
            backHref={`/sessions/${session.slug}`}
            backLabel="Back to Service Assets"
            tagline="Sermon Quotes"
            headerExtra={<div className="header-date">{contextParts.join(' · ')}</div>}
        >
            <Head title="Sermon Quotes" />

            {quotes.length > 0 ? (
                <main className="gallery">
                    {quotes.map((quote) => (
                        <div className="quote-card" key={quote.url}>
                            <div className="quote-image-wrap" onClick={() => setLightboxSrc(quote.url)}>
                                <img src={quote.url} alt={quote.title} loading="lazy" />
                            </div>
                            <div className="quote-actions">
                                <a className="action-btn" href={quote.url} download={quote.downloadName}>
                                    ⬇ Download
                                </a>
                                <button className="action-btn share-btn" onClick={() => share(quote)}>
                                    ↗ Share
                                </button>
                            </div>
                        </div>
                    ))}
                </main>
            ) : (
                <div className="empty-state">
                    <span className="flame">🔥</span>
                    <p>Quote images for this service will appear here once they are uploaded.</p>
                </div>
            )}

            {lightboxSrc && (
                <div className="lightbox" onClick={(e) => e.target === e.currentTarget && setLightboxSrc(null)}>
                    <button className="lightbox-close" onClick={() => setLightboxSrc(null)}>
                        &times;
                    </button>
                    <img src={lightboxSrc} alt="Full size quote" />
                </div>
            )}

            <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
        </Layout>
    );
}
