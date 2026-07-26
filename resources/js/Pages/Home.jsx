import { Head, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';

export default function Home({ serviceTypes, latestSession }) {
    return (
        <Layout>
            <Head title={null} />

            {latestSession && (
                <div className="latest-service">
                    <div className="latest-label">Latest Service</div>
                    <Link className="service-item" href={`/sessions/${latestSession.slug}`}>
                        <div className="service-item-info">
                            <div className="service-icon">{latestSession.icon}</div>
                            <div className="service-item-text">
                                <div className="day-label">
                                    {latestSession.editionTag ?? `${latestSession.serviceType} · ${latestSession.program}`}
                                </div>
                                <h3>
                                    {latestSession.subtitle
                                        ? `${latestSession.name} — ${latestSession.subtitle}`
                                        : latestSession.name}
                                </h3>
                                {latestSession.dateLabel && <div className="s-date">{latestSession.dateLabel}</div>}
                                {latestSession.minister && (
                                    <div className="s-minister">Ministering: {latestSession.minister}</div>
                                )}
                            </div>
                        </div>
                        <span className="arrow-btn">View →</span>
                    </Link>
                </div>
            )}

            <div className="category-grid">
                {serviceTypes.map((type) => (
                    <Link className="cat-card" href={`/service-types/${type.slug}`} key={type.slug}>
                        <div className="cat-icon">{type.icon}</div>
                        <div className="cat-label">{type.name}</div>
                        <div className="cat-sub">{type.subtitle}</div>
                    </Link>
                ))}
            </div>

            {serviceTypes.length === 0 && (
                <div className="empty-state">
                    <span className="flame">✨</span>
                    <p>No service types yet. Sign in to the admin area to add one.</p>
                </div>
            )}
        </Layout>
    );
}
