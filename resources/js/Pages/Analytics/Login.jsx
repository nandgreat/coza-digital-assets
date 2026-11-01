import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AnalyticsLoginLayout from '../../Layouts/AnalyticsLoginLayout';
import '../../../css/analyticsLogin.css';

export default function Login({ username }) {
    const { data, setData, post, processing, errors } = useForm({
        username: username ?? 'Analytics',
        password: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/analytics/login', { onFinish: () => setData('password', '') });
    };

    return (
        <AnalyticsLoginLayout tagline="Digital Assets">
            <Head title="Analytics Login" />

            <form
                className="analytic-card analytics-login bg-white/30 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl"
                onSubmit={handleSubmit}
            >
                {/** <h2 className="admin-card-title text-purple-900">Analytics Sign In</h2> */}
                {/** <p className="admin-hint text-purple-700/70">Enter your secure password to access the dashboard.</p> */}
                <p className="analytic-hint text-purple-700/70">Enter your secure password to access the dashboard.</p>

                <label className="admin-field">
                    <span className="text-fuchsia-200">Username</span>
                    <input
                        type="text"
                        value={data.username}
                        readOnly
                        className="bg-white/40 border-white/30 text-purple-900 cursor-not-allowed"
                    />
                </label>

                <label className="admin-field">
                    <span className="text-fuchsia-200">Password</span>
                    <input
                        type="password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        autoComplete="current-password"
                        autoFocus
                        placeholder="Enter password"
                        className="bg-white/40 border-white/30 text-fuchsia-300 placeholder-fuchsia-300/50"
                    />
                    <span className="admin-counter text-purple-600/40">{data.password.length} chars</span>
                    {errors.password && <span className="admin-error">{errors.password}</span>}
                    {errors.username && <span className="admin-error">{errors.username}</span>}
                </label>

                <button
                    type="submit"
                    className="analytics-btn admin-submit border-none"
                    disabled={processing}
                >
                    {processing ? 'Authenticating…' : 'Access Dashboard'}
                </button>
            </form>
        </AnalyticsLoginLayout>
    );
}
