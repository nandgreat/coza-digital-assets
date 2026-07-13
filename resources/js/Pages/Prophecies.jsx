import { Head } from '@inertiajs/react';
import { useState } from 'react';
import Layout from '../Components/Layout';
import { trackDownload } from '../analytics';
import { shareImage } from '../share';

export default function Prophecies({ session, prophecies }) {
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

    function share(prophecy) {
        shareImage(prophecy, {
            onToast: showToast,
            context: {
                assetType: 'prophecy',
                assetTitle: prophecy.title,
                serviceType: session.serviceType,
                program: session.program.name,
                session: session.name,
            },
        });
    }

    return (
        <Layout
            backHref={`/sessions/${session.slug}`}
            backLabel="Back to Service Assets"
            tagline="7DG Prophecies"
            headerExtra={<div className="header-date">{contextParts.join(' · ')}</div>}
        >
            <Head title="7DG Prophecies" />

            {prophecies.length > 0 ? (
                <main className="gallery">
                    {prophecies.map((prophecy) => (
                        <div className="quote-card" key={prophecy.url}>
                            <div className="quote-image-wrap" onClick={() => setLightboxSrc(prophecy.url)}>
                                <img src={prophecy.url} alt={prophecy.title} loading="lazy" />
                            </div>
                            <div className="quote-actions">
                                <a
                                    className="action-btn"
                                    href={prophecy.downloadUrl ?? prophecy.url}
                                    onClick={() =>
                                        trackDownload({
                                            assetType: 'prophecy',
                                            assetTitle: prophecy.title,
                                            serviceType: session.serviceType,
                                            program: session.program.name,
                                            session: session.name,
                                        })
                                    }
                                >
                                    ⬇ Download
                                </a>
                                <button className="action-btn share-btn" onClick={() => share(prophecy)}>
                                    ↗ Share
                                </button>
                            </div>
                        </div>
                    ))}
                </main>
            ) : (
                <div className="empty-state">
                    <span className="flame">🕊️</span>
                    <p>Prophecy images for this service will appear here once they are uploaded.</p>
                </div>
            )}

            {lightboxSrc && (
                <div className="lightbox" onClick={(e) => e.target === e.currentTarget && setLightboxSrc(null)}>
                    <button className="lightbox-close" onClick={() => setLightboxSrc(null)}>
                        &times;
                    </button>
                    <img src={lightboxSrc} alt="Full size prophecy" />
                </div>
            )}

            <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
        </Layout>
    );
}
