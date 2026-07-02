import { Head, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';

export default function Home({ serviceTypes }) {
    return (
        <Layout>
            <Head title={null} />

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
