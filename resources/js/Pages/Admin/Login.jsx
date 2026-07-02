import { Head, useForm } from '@inertiajs/react';
import Layout from '../../Components/Layout';

export default function Login({ username }) {
    const { data, setData, post, processing, errors } = useForm({
        username: username ?? 'Asset Admin',
        password: '',
    });

    function submit(e) {
        e.preventDefault();
        post('/admin/login', { onFinish: () => setData('password', '') });
    }

    return (
        <Layout tagline="Asset Admin">
            <Head title="Admin Login" />

            <form className="admin-card admin-login" onSubmit={submit}>
                <h2 className="admin-card-title">Admin Sign In</h2>
                <p className="admin-hint">Enter the 64-character access password to manage assets.</p>

                <label className="admin-field">
                    <span>Username</span>
                    <input type="text" value={data.username} readOnly />
                </label>

                <label className="admin-field">
                    <span>Password</span>
                    <input
                        type="password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        autoComplete="current-password"
                        autoFocus
                        placeholder="64-character password"
                    />
                    <span className="admin-counter">{data.password.length}/64</span>
                    {errors.password && <span className="admin-error">{errors.password}</span>}
                    {errors.username && <span className="admin-error">{errors.username}</span>}
                </label>

                <button type="submit" className="arrow-btn admin-submit" disabled={processing}>
                    {processing ? 'Signing in…' : 'Sign In →'}
                </button>
            </form>
        </Layout>
    );
}
