import { Head } from '@inertiajs/react';
import { useState } from 'react';
import Layout from '../Components/Layout';
import { trackDownload, trackEvent } from '../analytics';
import { shareImage } from '../share';
import { downloadAll } from '../bulkDownload';

export default function Quotes({ session, quotes }) {
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [toast, setToast] = useState(null);
    const [bulk, setBulk] = useState({ active: false, done: 0, total: 0 });

    const contextParts = [
        session.editionTag ? session.editionTag : session.program.name,
        session.subtitle ? `${session.name} — ${session.subtitle}` : session.name,
        session.dateLabel,
    ].filter(Boolean);

    function showToast(message) {
        setToast(message);
        setTimeout(() => setToast(null), 2200);
    }

    function share(quote) {
        shareImage(quote, {
            onToast: showToast,
            context: {
                assetType: 'quote',
                assetTitle: quote.title,
                serviceType: session.serviceType,
                program: session.program.name,
                session: session.name,
            },
        });
    }

    async function handleDownloadAll() {
        if (bulk.active || quotes.length === 0) return;
        setBulk({ active: true, done: 0, total: quotes.length });
        await downloadAll(quotes, {
            onProgress: (done, total) => setBulk({ active: true, done, total }),
        });
        setBulk({ active: false, done: 0, total: 0 });
        showToast('All quotes downloaded');
        trackEvent('asset_download_all', {
            asset_type: 'quote',
            count: quotes.length,
            service_type: session.serviceType,
            program: session.program.name,
            session: session.name,
        });
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
                <>
                    <div className="gallery-actions">
                        <button className="arrow-btn" onClick={handleDownloadAll} disabled={bulk.active}>
                            {bulk.active
                                ? `Downloading ${bulk.done}/${bulk.total}…`
                                : `⬇ Download All (${quotes.length})`}
                        </button>
                    </div>
                    <main className="gallery">
                        {quotes.map((quote) => (
                        <div className="quote-card" key={quote.url}>
                            <div className="quote-image-wrap" onClick={() => setLightboxSrc(quote.url)}>
                                <img src={quote.url} alt={quote.title} loading="lazy" />
                            </div>
                            <div className="quote-actions">
                                <a
                                    className="action-btn"
                                    href={quote.downloadUrl ?? quote.url}
                                    onClick={() =>
                                        trackDownload({
                                            assetType: 'quote',
                                            assetTitle: quote.title,
                                            serviceType: session.serviceType,
                                            program: session.program.name,
                                            session: session.name,
                                        })
                                    }
                                >
                                    ⬇ Download
                                </a>
                                <button className="action-btn share-btn" onClick={() => share(quote)}>
                                    ↗ Share
                                </button>
                                </div>
                            </div>
                        ))}
                    </main>
                </>
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
