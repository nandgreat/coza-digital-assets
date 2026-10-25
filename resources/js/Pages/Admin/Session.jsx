import { Link, router, useForm } from '@inertiajs/react';
import { useRef } from 'react';
import AdminLayout from '../../Components/AdminLayout';

function DetailsForm({ session }) {
    const { data, setData, put, processing, errors } = useForm({
        name: session.name ?? '',
        subtitle: session.subtitle ?? '',
        day_label: session.dayLabel ?? '',
        session_date: session.sessionDate ?? '',
        minister: session.minister ?? '',
        icon: session.icon ?? '',
    });

    function submit(e) {
        e.preventDefault();
        put(`/admin/sessions/${session.slug}`, { preserveScroll: true });
    }

    return (
        <form className="admin-detail-grid" onSubmit={submit}>
            <label className="admin-field"><span>Name</span>
                <input value={data.name} onChange={(e) => setData('name', e.target.value)} />
                {errors.name && <span className="admin-error">{errors.name}</span>}
            </label>
            <label className="admin-field"><span>Subtitle</span>
                <input value={data.subtitle} onChange={(e) => setData('subtitle', e.target.value)} />
            </label>
            <label className="admin-field"><span>Day label</span>
                <input value={data.day_label} onChange={(e) => setData('day_label', e.target.value)} />
            </label>
            <label className="admin-field"><span>Date</span>
                <input type="date" value={data.session_date} onChange={(e) => setData('session_date', e.target.value)} />
            </label>
            <label className="admin-field"><span>Minister</span>
                <input value={data.minister} onChange={(e) => setData('minister', e.target.value)} />
            </label>
            <label className="admin-field"><span>Icon</span>
                <input value={data.icon} onChange={(e) => setData('icon', e.target.value)} />
            </label>
            <button type="submit" className="arrow-btn" disabled={processing}>Save details</button>
        </form>
    );
}

function SermonNotesSlot({ session }) {
    const inputRef = useRef(null);
    const { setData, post, processing, errors, progress } = useForm({ files: [] });

    function upload(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setData('files', files);
        post(`/admin/sessions/${session.slug}/sermon-notes`, {
            preserveScroll: true,
            forceFormData: true,
            onFinish: () => { if (inputRef.current) inputRef.current.value = ''; },
        });
    }

    return (
        <div className="admin-slot">
            <div className="admin-slot-head">
                <h3>Sermon Notes</h3>
                <p>Upload one or more PDF files (max 20 MB each).</p>
            </div>

            {session.sermonNotes.length > 0 ? (
                <div className="admin-file-list">
                    {session.sermonNotes.map((note, i) => (
                        <div className="admin-slot-current" key={note.id}>
                            <a href={note.url} target="_blank" rel="noreferrer" className="admin-filelink">
                                📄 {note.name || `Sermon notes ${i + 1}`}
                            </a>
                            <button
                                className="admin-danger"
                                onClick={() => router.delete(`/admin/sessions/${session.slug}/sermon-notes/${note.id}`, { preserveScroll: true })}
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="admin-empty-slot">No sermon notes uploaded yet.</p>
            )}

            <label className="arrow-btn small admin-upload-btn">
                Upload PDFs
                <input ref={inputRef} type="file" accept="application/pdf" multiple hidden onChange={upload} disabled={processing} />
            </label>
            {progress && <span className="admin-progress">{progress.percentage}%</span>}
            {errors.files && <span className="admin-error">{errors.files}</span>}
        </div>
    );
}

function QuotesSlot({ session }) {
    const inputRef = useRef(null);
    const { setData, post, processing, errors, progress } = useForm({ images: [] });

    function upload(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setData('images', files);
        post(`/admin/sessions/${session.slug}/quotes`, {
            preserveScroll: true,
            forceFormData: true,
            onFinish: () => { if (inputRef.current) inputRef.current.value = ''; },
        });
    }

    return (
        <div className="admin-slot">
            <div className="admin-slot-head">
                <h3>Sermon Quotes</h3>
                <p>Upload one or more quote images. They appear in the public gallery.</p>
            </div>

            {session.quotes.length > 0 ? (
                <div className="admin-quote-grid">
                    {session.quotes.map((quote) => (
                        <div className="admin-quote" key={quote.id}>
                            <img src={quote.url} alt="Sermon quote" />
                            <button
                                className="admin-quote-remove"
                                title="Remove"
                                onClick={() => router.delete(`/admin/sessions/${session.slug}/quotes/${quote.id}`, { preserveScroll: true })}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="admin-empty-slot">No quotes uploaded yet.</p>
            )}

            <label className="arrow-btn small admin-upload-btn">
                Upload images
                <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={upload} disabled={processing} />
            </label>
            {progress && <span className="admin-progress">{progress.percentage}%</span>}
            {errors.images && <span className="admin-error">{errors.images}</span>}
        </div>
    );
}

function BlessingsSlot({ session }) {
    const inputRef = useRef(null);
    const { setData, post, processing, errors, progress } = useForm({ images: [] });

    function upload(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setData('images', files);
        post(`/admin/sessions/${session.slug}/blessings`, {
            preserveScroll: true,
            forceFormData: true,
            onFinish: () => { if (inputRef.current) inputRef.current.value = ''; },
        });
    }

    return (
        <div className="admin-slot">
            <div className="admin-slot-head">
                <h3>Our Father's Blessing</h3>
                <p>Upload one or more blessing images. They appear in the public gallery.</p>
            </div>

            {session.blessings.length > 0 ? (
                <div className="admin-quote-grid">
                    {session.blessings.map((blessing) => (
                        <div className="admin-quote" key={blessing.id}>
                            <img src={blessing.url} alt="Our Father's Blessing" />
                            <button
                                className="admin-quote-remove"
                                title="Remove"
                                onClick={() => router.delete(`/admin/sessions/${session.slug}/blessings/${blessing.id}`, { preserveScroll: true })}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="admin-empty-slot">No blessings uploaded yet.</p>
            )}

            <label className="arrow-btn small admin-upload-btn">
                Upload images
                <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={upload} disabled={processing} />
            </label>
            {progress && <span className="admin-progress">{progress.percentage}%</span>}
            {errors.images && <span className="admin-error">{errors.images}</span>}
        </div>
    );
}

function PropheciesSlot({ session }) {
    const inputRef = useRef(null);
    const { setData, post, processing, errors, progress } = useForm({ images: [] });

    function upload(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setData('images', files);
        post(`/admin/sessions/${session.slug}/prophecies`, {
            preserveScroll: true,
            forceFormData: true,
            onFinish: () => { if (inputRef.current) inputRef.current.value = ''; },
        });
    }

    return (
        <div className="admin-slot">
            <div className="admin-slot-head">
                <h3>7DG Prophecies</h3>
                <p>Upload one or more prophecy images. They appear in the public gallery.</p>
            </div>

            {session.prophecies.length > 0 ? (
                <div className="admin-quote-grid">
                    {session.prophecies.map((prophecy) => (
                        <div className="admin-quote" key={prophecy.id}>
                            <img src={prophecy.url} alt="7DG prophecy" />
                            <button
                                className="admin-quote-remove"
                                title="Remove"
                                onClick={() => router.delete(`/admin/sessions/${session.slug}/prophecies/${prophecy.id}`, { preserveScroll: true })}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="admin-empty-slot">No prophecies uploaded yet.</p>
            )}

            <label className="arrow-btn small admin-upload-btn">
                Upload images
                <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={upload} disabled={processing} />
            </label>
            {progress && <span className="admin-progress">{progress.percentage}%</span>}
            {errors.images && <span className="admin-error">{errors.images}</span>}
        </div>
    );
}

export default function Session({ session }) {
    return (
        <AdminLayout title={`Manage — ${session.name}`}>
            <div className="admin-header-row">
                <div>
                    <Link href="/admin" className="admin-link">← Dashboard</Link>
                    <h1 className="admin-page-title">{session.name}</h1>
                    <p className="admin-hint">
                        {session.program.serviceType} · {session.program.name}
                        {' — '}
                        <a href={session.publicUrl} target="_blank" rel="noreferrer" className="admin-link">public page ↗</a>
                    </p>
                </div>
                <button
                    className="admin-danger big"
                    onClick={() => { if (window.confirm('Delete this session and all its files?')) router.delete(`/admin/sessions/${session.slug}`); }}
                >
                    Delete session
                </button>
            </div>

            <section className="admin-card">
                <h2 className="admin-card-title">Session details</h2>
                <DetailsForm session={session} />
            </section>

            <section className="admin-card">
                <h2 className="admin-card-title">Resources</h2>
                <div className="admin-slots">
                    <SermonNotesSlot session={session} />
                    <BlessingsSlot session={session} />
                    <QuotesSlot session={session} />
                    <PropheciesSlot session={session} />
                </div>
            </section>
        </AdminLayout>
    );
}
