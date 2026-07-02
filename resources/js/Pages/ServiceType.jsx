import { Head, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';

export default function ServiceType({ serviceType, programs }) {
    return (
        <Layout backHref="/" backLabel="Back to Home">
            <Head title={serviceType.pageTitle} />

            <div className="page-title">{serviceType.pageTitle}</div>
            <div className="divider" />

            <div className="service-list">
                {programs.map((program) => (
                    <Link className="service-item" href={`/programs/${program.slug}`} key={program.slug}>
                        <div className="service-item-info">
                            <div className="service-icon">{program.icon}</div>
                            <div className="service-item-text">
                                <h3>{program.name}</h3>
                                {program.subtitle && <div className="s-sub">{program.subtitle}</div>}
                                <div className="s-date">
                                    {program.sessionCount} {program.sessionCount === 1 ? 'session' : 'sessions'}
                                </div>
                            </div>
                        </div>
                        <span className="arrow-btn">View →</span>
                    </Link>
                ))}
            </div>

            {programs.length === 0 && (
                <div className="empty-state">
                    <span className="flame">✨</span>
                    <p>No programs under this service type yet.</p>
                </div>
            )}
        </Layout>
    );
}
