import { Head, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';

export default function Session({ session, resources }) {
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
                        {resource.type === 'quotes' ? (
                            <Link className="action-btn" href={resource.url}>
                                View
                            </Link>
                        ) : (
                            <a className="action-btn" href={resource.url} download>
                                Download
                            </a>
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
        </Layout>
    );
}
