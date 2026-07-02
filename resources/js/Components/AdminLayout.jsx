import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function AdminLayout({ title, children }) {
    const { flash } = usePage().props;
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (flash?.success) {
            setToast(flash.success);
            const t = setTimeout(() => setToast(null), 2600);
            return () => clearTimeout(t);
        }
    }, [flash?.success]);

    return (
        <div className="admin-wrap">
            <Head title={title} />

            <div className="admin-topbar">
                <Link href="/admin" className="admin-brand">
                    <span className="admin-brand-mark">COZA</span>
                    <span className="admin-brand-sub">Asset Admin</span>
                </Link>
                <div className="admin-topbar-actions">
                    <Link href="/" className="admin-link">
                        View site ↗
                    </Link>
                    <button className="admin-link admin-logout" onClick={() => router.post('/admin/logout')}>
                        Log out
                    </button>
                </div>
            </div>

            <div className="admin-content">{children}</div>

            <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
        </div>
    );
}
