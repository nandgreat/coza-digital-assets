import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '../../Components/AdminLayout';

function AddServiceType() {
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        subtitle: '',
        icon: '',
        edition_label: '',
    });

    function submit(e) {
        e.preventDefault();
        post('/admin/service-types', { onSuccess: () => reset() });
    }

    return (
        <form className="admin-inline-form" onSubmit={submit}>
            <input placeholder="Service type name" value={data.name} onChange={(e) => setData('name', e.target.value)} />
            <input placeholder="Subtitle" value={data.subtitle} onChange={(e) => setData('subtitle', e.target.value)} />
            <input className="icon-input" placeholder="Icon" value={data.icon} onChange={(e) => setData('icon', e.target.value)} />
            <input placeholder="Edition label (optional)" value={data.edition_label} onChange={(e) => setData('edition_label', e.target.value)} />
            <button type="submit" className="arrow-btn" disabled={processing}>Add Service Type</button>
            {errors.name && <span className="admin-error">{errors.name}</span>}
        </form>
    );
}

function AddProgram({ serviceTypeId }) {
    const { data, setData, post, processing, reset } = useForm({
        service_type_id: serviceTypeId,
        name: '',
        subtitle: '',
        icon: '',
    });

    function submit(e) {
        e.preventDefault();
        post('/admin/programs', { onSuccess: () => reset('name', 'subtitle', 'icon') });
    }

    return (
        <form className="admin-inline-form sub" onSubmit={submit}>
            <input placeholder="Program name" value={data.name} onChange={(e) => setData('name', e.target.value)} />
            <input placeholder="Subtitle" value={data.subtitle} onChange={(e) => setData('subtitle', e.target.value)} />
            <input className="icon-input" placeholder="Icon" value={data.icon} onChange={(e) => setData('icon', e.target.value)} />
            <button type="submit" className="arrow-btn small" disabled={processing}>Add Program</button>
        </form>
    );
}

function AddSession({ programId }) {
    const { data, setData, post, processing, reset } = useForm({
        program_id: programId,
        name: '',
        subtitle: '',
        day_label: '',
        session_date: '',
        minister: '',
        icon: '',
    });

    function submit(e) {
        e.preventDefault();
        post('/admin/sessions', { onSuccess: () => reset('name', 'subtitle', 'day_label', 'session_date', 'minister', 'icon') });
    }

    return (
        <form className="admin-inline-form sub deep" onSubmit={submit}>
            <input placeholder="Session name" value={data.name} onChange={(e) => setData('name', e.target.value)} />
            <input placeholder="Subtitle" value={data.subtitle} onChange={(e) => setData('subtitle', e.target.value)} />
            <input placeholder="Day label" value={data.day_label} onChange={(e) => setData('day_label', e.target.value)} />
            <input type="date" value={data.session_date} onChange={(e) => setData('session_date', e.target.value)} />
            <input placeholder="Minister" value={data.minister} onChange={(e) => setData('minister', e.target.value)} />
            <input className="icon-input" placeholder="Icon" value={data.icon} onChange={(e) => setData('icon', e.target.value)} />
            <button type="submit" className="arrow-btn small" disabled={processing}>Add Session</button>
        </form>
    );
}

function confirmDelete(url, message) {
    if (window.confirm(message)) {
        router.delete(url, { preserveScroll: true });
    }
}

export default function Dashboard({ serviceTypes }) {
    const [openType, setOpenType] = useState(null);

    return (
        <AdminLayout title="Dashboard">
            <div className="admin-header-row">
                <h1 className="admin-page-title">Assets</h1>
            </div>

            <section className="admin-card">
                <h2 className="admin-card-title">New Service Type</h2>
                <AddServiceType />
            </section>

            {serviceTypes.map((type) => (
                <section className="admin-card" key={type.id}>
                    <div className="admin-node type-node">
                        <button className="admin-node-toggle" onClick={() => setOpenType(openType === type.id ? null : type.id)}>
                            <span className="admin-node-icon">{type.icon}</span>
                            <span>
                                <strong>{type.name}</strong>
                                {type.editionLabel && <em className="admin-badge">{type.editionLabel}</em>}
                                <span className="admin-node-sub">{type.subtitle}</span>
                            </span>
                        </button>
                        <button
                            className="admin-danger"
                            onClick={() => confirmDelete(`/admin/service-types/${type.slug}`, `Delete "${type.name}" and everything under it?`)}
                        >
                            Delete
                        </button>
                    </div>

                    <div className="admin-children">
                        {type.programs.map((program) => (
                            <div className="admin-node program-node" key={program.id}>
                                <div className="admin-node-line">
                                    <span>
                                        <span className="admin-node-icon">{program.icon}</span>
                                        <strong>{program.name}</strong>
                                        <span className="admin-node-sub">{program.subtitle}</span>
                                    </span>
                                    <button
                                        className="admin-danger"
                                        onClick={() => confirmDelete(`/admin/programs/${program.slug}`, `Delete program "${program.name}" and its sessions?`)}
                                    >
                                        Delete
                                    </button>
                                </div>

                                <div className="admin-children">
                                    {program.sessions.map((session) => (
                                        <div className="admin-node session-node" key={session.id}>
                                            <span>
                                                {session.dayLabel && <em className="admin-badge">{session.dayLabel}</em>}
                                                <strong>{session.name}</strong>
                                                {session.dateLabel && <span className="admin-node-sub">{session.dateLabel}</span>}
                                            </span>
                                            <span className="admin-node-actions">
                                                <Link href={`/admin/sessions/${session.slug}/edit`} className="arrow-btn small">
                                                    Manage
                                                </Link>
                                                <button
                                                    className="admin-danger"
                                                    onClick={() => confirmDelete(`/admin/sessions/${session.slug}`, `Delete session "${session.name}"?`)}
                                                >
                                                    Delete
                                                </button>
                                            </span>
                                        </div>
                                    ))}
                                    <AddSession programId={program.id} />
                                </div>
                            </div>
                        ))}
                        <AddProgram serviceTypeId={type.id} />
                    </div>
                </section>
            ))}

            {serviceTypes.length === 0 && <p className="admin-hint">No service types yet — add your first one above.</p>}
        </AdminLayout>
    );
}
