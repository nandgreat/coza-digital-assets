import { Head } from '@inertiajs/react';
import { useState } from 'react';
import Layout from '../Components/Layout';
import { trackDownload } from '../analytics';
import { shareImage } from '../share';

export default function Blessings({ session, blessings }) {
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

    function share(blessing) {
        shareImage(blessing, {
            onToast: showToast,
            context: {
                assetType: 'blessing',
                assetTitle: blessing.title,
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
            tagline="Our Father's Blessings"
            headerExtra={<div className="header-date">{contextParts.join(' · ')}</div>}
        >
            <Head title="Our Father's Blessings" />

            {blessings.length > 0 ? (
                <main className="gallery">
                    {blessings.map((blessing) => (
                        <div className="quote-card" key={blessing.url}>
                            <div className="quote-image-wrap" onClick={() => setLightboxSrc(blessing.url)}>
                                <img src={blessing.url} alt={blessing.title} loading="lazy" />
                            </div>
                            <div className="quote-actions">
                                <a
                                    className="action-btn"
                                    href={blessing.downloadUrl ?? blessing.url}
                                    onClick={() =>
                                        trackDownload({
                                            assetType: 'blessing',
                                            assetTitle: blessing.title,
                                            serviceType: session.serviceType,
                                            program: session.program.name,
                                            session: session.name,
                                        })
                                    }
                                >
                                    ⬇ Download
                                </a>
                                <button className="action-btn share-btn" onClick={() => share(blessing)}>
                                    ↗ Share
                                </button>
                            </div>
                        </div>
                    ))}
                </main>
            ) : (
                <div className="empty-state">
                    <span className="flame">🙏</span>
                    <p>Blessing images for this service will appear here once they are uploaded.</p>
                </div>
            )}

            {lightboxSrc && (
                <div className="lightbox" onClick={(e) => e.target === e.currentTarget && setLightboxSrc(null)}>
                    <button className="lightbox-close" onClick={() => setLightboxSrc(null)}>
                        &times;
                    </button>
                    <img src={lightboxSrc} alt="Full size blessing" />
                </div>
            )}

            <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
        </Layout>
    );
}
