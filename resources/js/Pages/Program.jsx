import { Head, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';

export default function Program({ program, sessions }) {
    return (
        <Layout
            backHref={`/service-types/${program.serviceType.slug}`}
            backLabel={`Back to ${program.serviceType.pageTitle}`}
        >
            <Head title={program.name} />

            <div className="page-title">{program.name}</div>
            <div className="divider" />

            <div className="service-list">
                {sessions.map((session) => (
                    <Link className="service-item" href={`/sessions/${session.slug}`} key={session.slug}>
                        <div className="service-item-info">
                            <div className="service-icon">{session.icon}</div>
                            <div className="service-item-text">
                                {session.dayLabel && <div className="day-label">{session.dayLabel}</div>}
                                <h3>{session.subtitle ? `${session.name} — ${session.subtitle}` : session.name}</h3>
                                {session.dateLabel && <div className="s-date">{session.dateLabel}</div>}
                                {session.minister && <div className="s-minister">Ministering: {session.minister}</div>}
                            </div>
                        </div>
                        <span className="arrow-btn">View →</span>
                    </Link>
                ))}
            </div>

            {sessions.length === 0 && (
                <div className="empty-state">
                    <span className="flame">✨</span>
                    <p>No sessions in this program yet.</p>
                </div>
            )}
        </Layout>
    );
}
