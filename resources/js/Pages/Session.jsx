import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import Layout from '../Components/Layout';
import { trackDownload, trackEvent } from '../analytics';
import { downloadAll } from '../bulkDownload';

export default function Session({ session, resources, downloads }) {
    const [bulk, setBulk] = useState({ active: false, done: 0, total: 0 });
    const [toast, setToast] = useState(null);

    function showToast(message) {
        setToast(message);
        setTimeout(() => setToast(null), 2600);
    }

    async function handleDownloadAll() {
        if (bulk.active || !downloads || downloads.length === 0) return;
        setBulk({ active: true, done: 0, total: downloads.length });
        await downloadAll(downloads, {
            onProgress: (done, total) => setBulk({ active: true, done, total }),
        });
        setBulk({ active: false, done: 0, total: 0 });
        showToast('All service assets downloaded');
        trackEvent('assets_download_all', {
            count: downloads.length,
            service_type: session.serviceType,
            program: session.program.name,
            session: session.name,
        });
    }

    return (
        <Layout backHref={`/programs/${session.program.slug}`} backLabel={`Back to ${session.program.name}`}>
            <Head title={session.name} />

            <div className="service-card">
                {session.editionTag && <div className="edition-tag">{session.editionTag}</div>}
                <div className="service-name">{session.name}</div>
                {session.dateLabel && <div className="service-date">{session.dateLabel}</div>}
                {session.subtitle && <div className="service-sub">{session.subtitle}</div>}
                {session.minister && <div className="minister">Ministering: {session.minister}</div>}
            </div>

            {downloads && downloads.length > 0 && (
                <div className="download-all-bar">
                    <button className="arrow-btn" onClick={handleDownloadAll} disabled={bulk.active}>
                        {bulk.active
                            ? `Downloading ${bulk.done}/${bulk.total}…`
                            : `⬇ Download All Service Assets (${downloads.length})`}
                    </button>
                </div>
            )}

            <main className="resources">
                {resources.map((resource) => (
                    <div className="resource-card" key={resource.title}>
                        <div className="resource-info">
                            <div className="icon-circle">{resource.icon}</div>
                            <div className="resource-text">
                                <h3>{resource.title}</h3>
                                <p>{resource.description}</p>
                            </div>
                        </div>
                        {resource.type === 'download' ? (
                            <a
                                className="action-btn"
                                href={resource.downloadUrl ?? resource.url}
                                onClick={() =>
                                    trackDownload({
                                        assetType: resource.assetType,
                                        assetTitle: resource.title,
                                        serviceType: session.serviceType,
                                        program: session.program.name,
                                        session: session.name,
                                    })
                                }
                            >
                                Download
                            </a>
                        ) : (
                            <Link className="action-btn" href={resource.url}>
                                View
                            </Link>
                        )}
                    </div>
                ))}

                {resources.length === 0 && (
                    <div className="empty-state">
                        <span className="flame">✨</span>
                        <p>No resources have been uploaded for this session yet.</p>
                    </div>
                )}
            </main>

            <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
        </Layout>
    );
}
